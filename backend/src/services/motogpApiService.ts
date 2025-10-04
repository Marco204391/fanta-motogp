// backend/src/services/motogpApiService.ts
import axios from 'axios';
import { Category, PrismaClient, RiderType, Rider, SessionType, Race } from '@prisma/client';

const prisma = new PrismaClient();

interface MotoGPApiConfig {
  baseUrl: string;
  resultsApi: string;
  broadcastApi: string;
}

const config: MotoGPApiConfig = {
  baseUrl: 'https://api.motogp.pulselive.com/motogp/v1',
  resultsApi: 'https://api.motogp.pulselive.com/motogp/v1/results',
  broadcastApi: 'https://api.motogp.pulselive.com/motogp/v1'
};

const CATEGORY_MAPPING: Record<string, Category> = {
  'e8c110ad-64aa-4e8e-8a86-f2f152f6a942': Category.MOTOGP,
  '549640b8-fd9c-4245-acfd-60e4bc38b25c': Category.MOTO2,
  '954f7e65-2ef2-4423-b949-4961cc603e45': Category.MOTO3,
};

const getRiderType = (apiRider: any): RiderType => {
    const careerStep = apiRider.current_career_step;
    if (!careerStep || !careerStep.type) return RiderType.TEST_RIDER;

    switch (careerStep.type.toUpperCase()) {
        case 'OFFICIAL':
            return RiderType.OFFICIAL;
        case 'WILDCARD':
            return RiderType.WILDCARD;
        case 'REPLACEMENT':
        case 'SUBSTITUTE':
            return RiderType.REPLACEMENT;
        case 'TEST':
        default:
            return RiderType.TEST_RIDER;
    }
};

export class MotoGPApiService {
  private axiosInstance = axios.create({
    baseURL: config.baseUrl,
    timeout: 15000,
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'FantaMotoGP/1.0'
    }
  });

  async syncRiders() {
    try {
      console.log('🏍️ Sincronizzazione piloti in corso...');
      const response = await this.axiosInstance.get('/riders');
      const riders = response.data;
      
      console.log(`🔎 Trovati ${riders.length} piloti totali dall'API.`);
      let syncedCount = 0;
      let skippedCount = 0;

      for (const apiRider of riders) {
        const riderFullName = `${apiRider.name} ${apiRider.surname}`;
        const careerStep = apiRider.current_career_step;

        if (!careerStep?.category?.legacy_id) {
          console.log(`🟡 SKIPPATO: ${riderFullName} - Nessun career step valido.`);
          skippedCount++;
          continue;
        }
        
        const category = this.mapLegacyCategory(careerStep.category.legacy_id);
        
        if (!category) {
          console.log(`🟡 SKIPPATO: ${riderFullName} - Categoria non gestita (${careerStep.category.name}).`);
          skippedCount++;
          continue;
        }

        const value = this.calculateRiderValue(apiRider);
        const riderType = getRiderType(apiRider);
        const photoUrl = careerStep.pictures?.profile?.main ?? careerStep.pictures?.portrait;
        const isActive = !!careerStep;

        await prisma.rider.upsert({
          where: { apiRiderId: apiRider.id },
          update: {
            name: riderFullName,
            team: careerStep.sponsored_team,
            number: careerStep.number,
            category,
            nationality: apiRider.country.iso,
            value,
            isActive,
            photoUrl: photoUrl,
            riderType,
          },
          create: {
            name: riderFullName,
            number: careerStep.number,
            team: careerStep.sponsored_team,
            category,
            nationality: apiRider.country.iso,
            value,
            isActive,
            photoUrl: photoUrl,
            riderType,
            apiRiderId: apiRider.id,
          }
        });
        syncedCount++;
      }
      
      console.log('🎉 Sincronizzazione piloti completata!');
      console.log(`📊 Riepilogo: ${syncedCount} piloti sincronizzati, ${skippedCount} piloti scartati.`);
    } catch (error) {
      console.error('❌ Errore sincronizzazione piloti:', error);
      throw error;
    }
  }

  async syncRaceCalendar(season: number = new Date().getFullYear()) {
    try {
      console.log(`📅 Sincronizzazione calendario ${season}...`);
      
      const seasonsResponse = await this.axiosInstance.get('/results/seasons');
      const seasonData = seasonsResponse.data.find((s: any) => s.year === season);
      
      if (!seasonData) throw new Error(`Stagione ${season} non trovata`);

      const finishedEventsUrl = `/results/events?seasonUuid=${seasonData.id}&isFinished=true`;
      const upcomingEventsUrl = `/results/events?seasonUuid=${seasonData.id}&isFinished=false`;

      const [finishedEventsResponse, upcomingEventsResponse] = await Promise.all([
        this.axiosInstance.get(finishedEventsUrl),
        this.axiosInstance.get(upcomingEventsUrl)
      ]);

      const allEvents = [...finishedEventsResponse.data, ...upcomingEventsResponse.data];
      
      for (const event of allEvents) {
        if (event.test) {
          console.log(`🟡 SKIPPATO: ${event.name} (evento di test)`);
          continue;
        }

        let raceDate: Date | null = null;
        let sprintDate: Date | null = null;
        let trackLayoutUrl: string | null = null;

        try {
          const eventDetailsResponse = await this.axiosInstance.get(`/events/${event.toad_api_uuid}`);
          const eventData = eventDetailsResponse.data;
          const broadcasts = eventData?.broadcasts || [];
          
          if (eventData?.circuit?.track?.assets?.info?.path) {
            trackLayoutUrl = eventData.circuit.track.assets.info.path;
          }
          
          const raceSession = broadcasts.find((s: any) => s.shortname === 'RAC' && s.category.acronym === 'MGP');
          if (raceSession && raceSession.date_start) {
            raceDate = new Date(raceSession.date_start);
          }

          const sprintSession = broadcasts.find((s: any) => s.shortname === 'SPR' && s.category.acronym === 'MGP');
          if (sprintSession && sprintSession.date_start) {
            sprintDate = new Date(sprintSession.date_start);
          }
        } catch (sessionError) {
          console.warn(`⚠️ Impossibile recuperare i dettagli delle sessioni per ${event.name}, uso le date generali.`);
        }
        const roundNumber = event.sequence || event.number || 0; 
        
        await prisma.race.upsert({
          where: { apiEventId: event.id },
          update: {
            name: event.name,
            circuit: event.circuit.name,
            country: event.country.name,
            startDate: new Date(event.date_start),
            endDate: new Date(event.date_end),
            gpDate: raceDate || new Date(event.date_end),
            sprintDate: sprintDate,
            round: roundNumber,
            season,
            trackLayoutUrl
          },
          create: {
            name: event.name,
            circuit: event.circuit.name,
            country: event.country.name,
            startDate: new Date(event.date_start),
            endDate: new Date(event.date_end),
            gpDate: raceDate || new Date(event.date_end),
            sprintDate: sprintDate,
            round: roundNumber,
            season,
            apiEventId: event.id,
            trackLayoutUrl
          }
        });
        console.log(`✅ Sincronizzato evento: ${event.name}`);
      }

      console.log('🔄 Ricalcolo dei round in ordine cronologico...');
      const races = await prisma.race.findMany({
        where: { season },
        orderBy: { gpDate: 'asc' }
      });

      for (let i = 0; i < races.length; i++) {
        await prisma.race.update({
          where: { id: races[i].id },
          data: { round: i + 1 }
        });
      }
      
      console.log(`🎉 Calendario per la stagione ${season} sincronizzato e ordinato!`);
    } catch (error) {
      console.error(`❌ Errore sincronizzazione calendario ${season}:`, error);
      throw error;
    }
  }
  
  async syncRaceResults(raceId: string) {
    try {
      const race = await prisma.race.findUnique({ where: { id: raceId } });
      if (!race || !race.apiEventId) throw new Error('Gara non trovata o mancano dati API');

      let allCategoriesRaceFinished = true;

      for (const [categoryId, category] of Object.entries(CATEGORY_MAPPING)) {
        try {
          const sessionsResponse = await this.axiosInstance.get(`/results/sessions?eventUuid=${race.apiEventId}&categoryUuid=${categoryId}`);
          const sessions = sessionsResponse.data;
          
          const raceSession = sessions.find((s: any) => s.type === 'RAC');
          const sprintSession = sessions.find((s: any) => s.type === 'SPR');
          const q1Session = sessions.find((s: any) => (s.type === 'Q' && s.number === 1) || s.type === 'Q1');
          const q2Session = sessions.find((s: any) => (s.type === 'Q' && s.number === 2) || s.type === 'Q2');
          const fp1Session = sessions.find((s: any) => (s.type === 'FP' && s.number === 1) || s.type === 'FP1');
          const fp2Session = sessions.find((s: any) => (s.type === 'FP' && s.number === 2) || s.type === 'FP2');
          const prSession = sessions.find((s: any) => s.type === 'PR');

          // Controlla se la gara principale di questa categoria è finita
          if (!raceSession || raceSession.status !== 'FINISHED') {
            allCategoriesRaceFinished = false;
          }

          // Salva i risultati solo per le sessioni terminate
          if (raceSession && raceSession.status === 'FINISHED') {
            const resultsResponse = await axios.get(`https://api.motogp.pulselive.com/motogp/v2/results/classifications?session=${raceSession.id}&test=false`);
            if (resultsResponse.data?.classification) {
              await this.saveRaceResults(raceId, category, resultsResponse.data.classification, SessionType.RACE);
            }
          }
          if (sprintSession && sprintSession.status === 'FINISHED') {
            const resultsResponse = await axios.get(`https://api.motogp.pulselive.com/motogp/v2/results/classifications?session=${sprintSession.id}&test=false`);
            if (resultsResponse.data?.classification) {
              await this.saveRaceResults(raceId, category, resultsResponse.data.classification, SessionType.SPRINT);
            }
          }
          if (fp1Session && fp1Session.status === 'FINISHED') {
            const resultsResponse = await axios.get(`https://api.motogp.pulselive.com/motogp/v2/results/classifications?session=${fp1Session.id}&test=false`);
            if (resultsResponse.data?.classification) {
                await this.saveRaceResults(raceId, category, resultsResponse.data.classification, SessionType.FP1);
            }
          }
          if (fp2Session && fp2Session.status === 'FINISHED') {
            const resultsResponse = await axios.get(`https://api.motogp.pulselive.com/motogp/v2/results/classifications?session=${fp2Session.id}&test=false`);
            if (resultsResponse.data?.classification) {
                await this.saveRaceResults(raceId, category, resultsResponse.data.classification, SessionType.FP2);
            }
          }
          if (prSession && prSession.status === 'FINISHED') {
            const resultsResponse = await axios.get(`https://api.motogp.pulselive.com/motogp/v2/results/classifications?session=${prSession.id}&test=false`);
            if (resultsResponse.data?.classification) {
                await this.saveRaceResults(raceId, category, resultsResponse.data.classification, SessionType.PR);
            }
          }

          if (q2Session && q2Session.status === 'FINISHED') {
            const q2ResultsResponse = await axios.get(`https://api.motogp.pulselive.com/motogp/v2/results/classifications?session=${q2Session.id}&test=false`);
            if (q2ResultsResponse.data?.classification) {
              let finalClassification = q2ResultsResponse.data.classification;

              if (q1Session && q1Session.status === 'FINISHED') {
                const q1ResultsResponse = await axios.get(`https://api.motogp.pulselive.com/motogp/v2/results/classifications?session=${q1Session.id}&test=false`);
                if (q1ResultsResponse.data?.classification) {
                  const q1Results = q1ResultsResponse.data.classification;
                  const q2RiderIds = new Set(finalClassification.map((r: any) => r.rider.riders_api_uuid));
                  const q1RidersToAppend = q1Results.filter((r: any) => !q2RiderIds.has(r.rider.riders_api_uuid));
                  const lastQ2Position = finalClassification.length;
                  const adjustedQ1Riders = q1RidersToAppend.map((rider: any, index: number) => ({
                      ...rider,
                      position: lastQ2Position + index + 1,
                  }));
                  finalClassification = [...finalClassification, ...adjustedQ1Riders];
                }
              }
              await this.saveRaceResults(raceId, category, finalClassification, SessionType.QUALIFYING);
            }
          }
        } catch (error) {
          console.error(`Errore sync risultati per ${category}:`, error);
        }
      }

      if (allCategoriesRaceFinished) {
        console.log(`🏁 Tutte le gare principali per ${race.name} sono terminate. Avvio calcolo punteggi...`);
        await this.calculateTeamScores(raceId, SessionType.RACE);
        if (race.sprintDate) {
          await this.calculateTeamScores(raceId, SessionType.SPRINT);
        }
      } else {
        console.log(`⏳ In attesa del completamento di tutte le gare principali per ${race.name}. Calcolo punteggi rimandato.`);
      }

      console.log(`✅ Sincronizzazione per ${race.name} completata.`);
      return { success: true, message: 'Sincronizzazione risultati completata.' };
      
    } catch (error) {
      console.error(`❌ Errore critico durante la sincronizzazione dei risultati per la gara ${raceId}:`, error);
      throw error;
    }
  }

  private async sessionHasResults (
    raceId: string, 
    category: Category, 
    sessionType: SessionType
  ): Promise<boolean> {
    const count = await prisma.raceResult.count({
      where: {
        raceId,
        session: sessionType,
        rider: { category }
      }
    });
    return count > 0;
  }

  async syncSession(raceId: string, category: Category, sessionType: SessionType): Promise<boolean> {
    const alreadyExists = await this.sessionHasResults(raceId, category, sessionType);
    
    if (alreadyExists) {
      console.log(`✅ [SKIP] ${category} - ${sessionType} già sincronizzata.`);
      return true; 
    }

    console.log(`🔄 [SYNC] Sincronizzazione ${category} - ${sessionType}...`);

    if (sessionType === SessionType.QUALIFYING) {
      return this.syncQualifyingResults(raceId, category);
    }
    if (sessionType === SessionType.RACE || sessionType === SessionType.SPRINT) {
      return this.syncRaceOrSprint(raceId, category, sessionType);
    }
    if (sessionType.startsWith('FP') || sessionType === 'PR') {
      return this.syncPractice(raceId, category, sessionType);
    }
    
    console.warn(`[SKIP] Tipo di sessione non gestito: ${sessionType}`);
    return false;
  }

  private async syncRaceOrSprint(raceId: string, category: Category, sessionType: 'RACE' | 'SPRINT'): Promise<boolean> {
    const race = await this.findRace(raceId);
    if (!race) return false;

    const categoryId = this.getApiCategoryId(category);
    if (!categoryId) return false;

    try {
        const apiSessionType = sessionType.slice(0, 3); // "RAC" o "SPR"
        const session = await this.findApiSession(race.apiEventId!, categoryId, s => s.type === apiSessionType);

        return await this.processAndSaveSessionResults(race, category, sessionType, session);
    } catch (error) {
        console.error(`[FAIL] Errore sync di ${race.name} - ${category} - ${sessionType}:`, error);
        return false;
    }
  }

  private async syncPractice(raceId: string, category: Category, sessionType: 'FP1' | 'FP2' | 'PR'): Promise<boolean> {
    const race = await this.findRace(raceId);
    if (!race) return false;

    const categoryId = this.getApiCategoryId(category);
    if (!categoryId) return false;

    try {
        const sessionNumber = parseInt(sessionType.replace(/[^0-9]/g, ''), 10) || null;
        const type = sessionType.replace(/[0-9]/g, '');
        
        const session = await this.findApiSession (
            race.apiEventId!, 
            categoryId, 
            s => s.type === sessionType || (s.type === type && s.number === sessionNumber)
        );

        return await this.processAndSaveSessionResults(race, category, sessionType, session);
    } catch (error) {
        console.error(`[FAIL] Errore sync di ${race.name} - ${category} - ${sessionType}:`, error);
        return false;
    }
  }
  
  private async syncQualifyingResults(raceId: string, category: Category): Promise<boolean> {
    const race = await this.findRace(raceId);
    const categoryId = this.getApiCategoryId(category);
    if (!race || !categoryId) return false;
    
    try {
        const allSessions = await this.getAllApiSessions(race.apiEventId!, categoryId);
        const q1Session = allSessions.find((s: any) => s.type === 'Q1' || (s.type === 'Q' && s.number === 1));
        const q2Session = allSessions.find((s: any) => s.type === 'Q2' || (s.type === 'Q' && s.number === 2));

        if (q1Session?.status !== 'FINISHED' || q2Session?.status !== 'FINISHED') {
            console.log(`[WAIT] Qualifiche per ${race.name} - ${category} non ancora concluse.`);
            return false;
        }
        
        const q2Results = await this.fetchSessionResults(q2Session.id);
        const q1Results = await this.fetchSessionResults(q1Session.id);
        
        if (!q2Results || !q1Results) {
            console.log(`[FAIL] Dati di qualifica mancanti per ${race.name} - ${category}.`);
            return false;
        }

        const finalClassification = this.mergeQualifyingResults(q2Results, q1Results);
        
        await this.saveRaceResults(raceId, category, finalClassification, SessionType.QUALIFYING);
        console.log(`[OK] Risultati qualifiche (Q1+Q2) salvati per ${race.name} - ${category}`);
        return true;
    } catch (error) {
        console.error(`[FAIL] Errore sync qualifiche per ${race.name} - ${category}:`, error);
        return false;
    }
  }

  private async fetchSessionResults(sessionId: string): Promise<any[] | null> {
      try {
        const response = await axios.get(`https://api.motogp.pulselive.com/motogp/v2/results/classifications?session=${sessionId}&test=false`);
        return response.data?.classification || null;
      } catch (error) {
        console.error(`Errore nel fetch dei risultati per la sessione ${sessionId}`, error);
        return null;
      }
  }

  private async processAndSaveSessionResults(race: Race, category: Category, sessionType: SessionType, session: any): Promise<boolean> {
    if (session && session.status === 'FINISHED') {
        const results = await this.fetchSessionResults(session.id);
        if (results) {
            await this.saveRaceResults(race.id, category, results, sessionType);
            console.log(`[OK] Risultati salvati per ${race.name} - ${category} - ${sessionType}`);
            return true;
        }
    } else {
        console.log(`[INFO] Sessione ${sessionType} per ${race.name} - ${category} non ancora conclusa o non trovata.`);
    }
    return false;
  }

  private mergeQualifyingResults(q2Results: any[], q1Results: any[]): any[] {
    const q2RiderIds = new Set(q2Results.map((r: any) => r.rider.riders_api_uuid));
    const q1RidersToAppend = q1Results.filter((r: any) => !q2RiderIds.has(r.rider.riders_api_uuid));
    const lastQ2Position = q2Results.length;
    
    const finalQ1Riders = q1RidersToAppend.map((rider: any, index: number) => ({
        ...rider,
        position: lastQ2Position + index + 1,
    }));

    return [...q2Results, ...finalQ1Riders];
  }

  private async findRace(raceId: string): Promise<Race | null> {
    const race = await prisma.race.findUnique({ where: { id: raceId } });
    if (!race || !race.apiEventId) {
        console.error(`[HELPER] Gara non trovata o senza apiEventId: ${raceId}`);
        return null;
    }
    return race;
  }

  private getApiCategoryId(category: Category): string | undefined {
    return Object.keys(CATEGORY_MAPPING).find(key => CATEGORY_MAPPING[key] === category);
  }
  
  private async getAllApiSessions(eventUuid: string, categoryUuid: string): Promise<any[]> {
    const response = await this.axiosInstance.get(`/results/sessions?eventUuid=${eventUuid}&categoryUuid=${categoryUuid}`);
    return response.data;
  }
  
  private async findApiSession(eventUuid: string, categoryUuid: string, filter: (s: any) => boolean): Promise<any | null> {
    const sessions = await this.getAllApiSessions(eventUuid, categoryUuid);
    return sessions.find(filter) || null;
  }

  private async saveRaceResults(raceId: string, category: Category, classification: any[], session: SessionType) {
    const finishedRiders = classification.filter(r => r.position !== null);
    const dnfRiders = classification.filter(r => r.position === null).sort((a, b) => (b.total_laps || 0) - (a.total_laps || 0));
    const lastPosition = finishedRiders.length;
    const finalClassification = [...finishedRiders, ...dnfRiders.map((rider, index) => ({ ...rider, position: lastPosition + index + 1 }))];

    for (const result of finalClassification) {
      let rider = await prisma.rider.findUnique({ where: { apiRiderId: result.rider.riders_api_uuid } });
      
      if (!rider) {
        rider = await this.fetchAndCreateRider(result.rider.riders_api_uuid, category);
        if (!rider) {
            console.warn(`[SAVE RESULTS] ⚠️ Impossibile trovare o creare il pilota ${result.rider.full_name}. Risultato saltato.`);
            continue;
        }
      }
      
      let status: 'FINISHED' | 'DNF' | 'DNS' | 'DSQ' = 'FINISHED';
      if (result.status === 'OUTSTND' || result.status === 'DNF') status = 'DNF';
      else if (result.status === 'DNS') status = 'DNS';
      else if (result.status === 'DSQ') status = 'DSQ';
      else if (!result.position) status = 'DNF';

      const dataToSave = {
        position: result.position || null,
        points: result.points || 0,
        status,
        time: result.time || null,
        totalLaps: result.total_laps || null,
        bestLap: result.best_lap || null,
      };

      await prisma.raceResult.upsert({
        where: { raceId_riderId_session: { raceId, riderId: rider.id, session } },
        update: dataToSave,
        create: {
          session,
          ...dataToSave,
          race: { connect: { id: raceId } },
          rider: { connect: { id: rider.id } }
        },
      });
    }
  }

  private async fetchAndCreateRider(apiRiderId: string, category: Category): Promise<Rider | null> {
    try {
        console.log(`[RIDER FETCH] Pilota con ID API ${apiRiderId} non trovato nel DB. Tentativo di recupero dall'API MotoGP...`);
        const response = await this.axiosInstance.get(`/riders/${apiRiderId}`);
        const apiRider = response.data;

        if (!apiRider) {
            console.log(`[RIDER FETCH] Nessun dato trovato dall'API per l'ID ${apiRiderId}.`);
            return null;
        }

        const riderFullName = `${apiRider.name} ${apiRider.surname}`;
        const careerStep = apiRider.current_career_step;

        const riderData = {
            name: riderFullName,
            apiRiderId: apiRider.id,
            category,
            number: careerStep?.number || 999, 
            team: careerStep?.sponsored_team || 'Team Sconosciuto',
            nationality: apiRider.country?.iso || 'N/A',
            value: 0,
            isActive: true,
            photoUrl: careerStep?.pictures?.profile?.main ?? careerStep?.pictures?.portrait,
            riderType: getRiderType(apiRider) || RiderType.WILDCARD,
        };

        const newRider = await prisma.rider.create({
            data: riderData
        });
        console.log(`[RIDER FETCH] Pilota "${newRider.name}" creato con successo nel DB.`);
        return newRider;
    } catch (error) {
        console.error(`[RIDER FETCH] ❌ Errore durante il recupero e la creazione del pilota con ID API ${apiRiderId}:`, error);
        return null;
    }
  }

  async calculateTeamScores(raceId: string, session: SessionType) {
    if (session !== SessionType.RACE) {
      console.log(`-- Il calcolo dei punteggi per la sessione ${session} verrà eseguito insieme a quello della gara principale. --`);
      return;
    }

    console.log(`-- Inizio calcolo punteggi combinato (Gara + Sprint) per la gara ${raceId} --`);
    try {
      const allSessionResults = await prisma.raceResult.findMany({
        where: { raceId, session: { in: ['RACE', 'SPRINT'] } },
        include: { rider: true },
      });

      if (allSessionResults.length === 0) {
        console.log(`Nessun risultato (Gara/Sprint) trovato per la gara ${raceId}. Calcolo saltato.`);
        return;
      }
      
      const raceResultsMap = new Map<string, { position: number | null, status: string }>();
      const sprintResultsMap = new Map<string, { position: number | null, status: string }>();
      const maxPositions: Record<string, { race: number, sprint: number }> = {
        MOTOGP: { race: 0, sprint: 0 },
        MOTO2: { race: 0, sprint: 0 },
        MOTO3: { race: 0, sprint: 0 },
      };

      allSessionResults.forEach(result => {
        const category = result.rider.category;
        if (result.session === 'RACE') {
          raceResultsMap.set(result.riderId, { position: result.position, status: result.status });
          if (result.position) maxPositions[category].race = Math.max(maxPositions[category].race, result.position);
        } else if (result.session === 'SPRINT') {
          sprintResultsMap.set(result.riderId, { position: result.position, status: result.status });
          if (result.position) maxPositions[category].sprint = Math.max(maxPositions[category].sprint, result.position);
        }
      });
      
      // Bonus Qualifiche
      const qualifyingResults = await prisma.raceResult.findMany({
          where: { raceId, session: 'QUALIFYING', position: { in: [1, 2, 3] } },
          select: { riderId: true, position: true }
      });

      const qualifyingBonusMap = new Map<string, number>();
      qualifyingResults.forEach(result => {
          if (result.position === 1) qualifyingBonusMap.set(result.riderId, -5);
          if (result.position === 2) qualifyingBonusMap.set(result.riderId, -3);
          if (result.position === 3) qualifyingBonusMap.set(result.riderId, -2);
      });

      // NUOVO: Bonus Sprint per MotoGP (solo top 10)
      const sprintBonusMap = new Map<string, number>();
      const sprintBonusPoints = [-10, -9, -8, -7, -6, -5, -4, -3, -2, -1]; // Dal 1° al 10°
      
      // Filtra solo i piloti MotoGP dalla Sprint
      const motogpSprintResults = await prisma.raceResult.findMany({
        where: { 
          raceId, 
          session: 'SPRINT',
          position: { lte: 10, gte: 1 },
          rider: { category: 'MOTOGP' }
        },
        select: { riderId: true, position: true },
        orderBy: { position: 'asc' }
      });

      motogpSprintResults.forEach(result => {
        if (result.position && result.position <= 10) {
          sprintBonusMap.set(result.riderId, sprintBonusPoints[result.position - 1]);
        }
      });

      const teamsInRace = await prisma.team.findMany({
          include: {
              riders: { include: { rider: true } },
              lineups: { 
                  where: { raceId },
                  include: { lineupRiders: { include: { rider: true } } }
              }
          }
      });

      for (const team of teamsInRace) {
        let lineupToUse = team.lineups[0];
        let calculationNotes = null;

        if (!lineupToUse) {
            const lastValidLineup = await prisma.raceLineup.findFirst({
                where: { teamId: team.id },
                orderBy: { createdAt: 'desc' },
                include: { lineupRiders: { include: { rider: true } } }
            });

            if (lastValidLineup) {
                // Crea una nuova lineup di fallback per la gara corrente
                const createdLineup = await prisma.raceLineup.create({
                    data: {
                        teamId: team.id,
                        raceId: raceId,
                        isFallback: true,
                        lineupRiders: {
                            create: lastValidLineup.lineupRiders.map(lr => ({
                                riderId: lr.riderId,
                                predictedPosition: lr.predictedPosition
                            }))
                        }
                    },
                    include: { lineupRiders: { include: { rider: true } } }
                });
                lineupToUse = createdLineup;
                calculationNotes = `Calcolato usando lo schieramento della gara precedente (fallback).`;
            } else {
                const penaltyRiders = ['MOTOGP', 'MOTO2', 'MOTO3'].flatMap(category => 
                    team.riders
                        .filter(r => r.rider.category === category)
                        .sort((a, b) => a.rider.value - b.rider.value)
                        .slice(0, 2)
                );

                lineupToUse = {
                    lineupRiders: penaltyRiders.map(tr => ({
                        rider: tr.rider,
                        predictedPosition: 30 
                    }))
                } as any;
                calculationNotes = `Nessuno schieramento trovato, applicata penalità massima (fallback).`;
            }
        }
        
        let totalTeamPoints = 0;
        const riderScores = [];

        for (const lineupRider of lineupToUse.lineupRiders) {
          const rider = lineupRider.rider;
          const predictedPosition = lineupRider.predictedPosition;
          
          const raceResult = raceResultsMap.get(rider.id);
          const sprintResult = sprintResultsMap.get(rider.id);
          
          // Calcolo punti base (solo dalla gara principale)
          const raceBasePoints = raceResult?.position ?? (maxPositions[rider.category].race + 1);
          
          // Calcolo malus previsione (solo per la gara principale)
          const racePredictionMalus = Math.abs(predictedPosition - raceBasePoints);
          
          // Bonus qualifiche
          const qualifyingBonus = qualifyingBonusMap.get(rider.id) || 0;
          
          // NUOVO: Bonus Sprint (solo per piloti MotoGP)
          const sprintBonus = sprintBonusMap.get(rider.id) || 0;
          
          // Calcolo totale punti pilota
          const pilotTotalPoints = raceBasePoints + racePredictionMalus + qualifyingBonus + sprintBonus;
          totalTeamPoints += pilotTotalPoints;

          riderScores.push({
            rider: rider.name,
            riderCategory: rider.category,
            points: pilotTotalPoints,
            predicted: predictedPosition,
            actual: raceResult?.position ?? raceResult?.status,
            sprintPosition: sprintResult?.position ?? sprintResult?.status,
            base: raceBasePoints,
            predictionMalus: racePredictionMalus,
            qualifyingBonus,
            sprintBonus,
            details: {
              raceBase: raceBasePoints,
              raceMalus: racePredictionMalus,
            }
          });
        }
        
        await prisma.teamScore.upsert({
          where: { teamId_raceId_session: { teamId: team.id, raceId, session: SessionType.RACE } },
          update: { totalPoints: totalTeamPoints, calculatedAt: new Date(), riderScores: riderScores as any, notes: calculationNotes },
          create: { teamId: team.id, raceId, session: SessionType.RACE, totalPoints: totalTeamPoints, riderScores: riderScores as any, notes: calculationNotes }
        });
        
        await prisma.teamScore.deleteMany({
          where: { teamId: team.id, raceId, session: SessionType.SPRINT }
        });

        console.log(`Team ${team.name}: ${totalTeamPoints} punti (combinato). Note: ${calculationNotes || 'Schieramento regolare'}`);
        console.log(`  - Bonus Sprint applicati: ${[...sprintBonusMap.entries()].filter(([rid]) => 
          lineupToUse.lineupRiders.some((lr: any) => lr.rider.id === rid)
        ).map(([_, bonus]) => bonus).join(', ') || 'nessuno'}`);
      }
    } catch (error) {
      console.error(`Errore nel calcolo dei punteggi combinati per la gara ${raceId}:`, error);
    }
  }
  
  private mapLegacyCategory(legacyId: number): Category | null {
    switch (legacyId) {
      case 3: return Category.MOTOGP;
      case 2: return Category.MOTO2;
      case 1: return Category.MOTO3;
      default: return null;
    }
  }

  private calculateRiderValue(apiRider: any): number {
    const baseValue = 50;
    const championships = apiRider.championships?.length || 0;
    const wins = apiRider.victories || 0;
    
    return Math.min(200, baseValue + (championships * 30) + (wins * 2));
  }
}

export const motogpApi = new MotoGPApiService();