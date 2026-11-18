// Physical-activity energy-cost database used by Activity → Other (search page).
//
// SOURCE: 2024 Adult Compendium of Physical Activities
//   Herrmann SD, Willis EA, Ainsworth BE, et al. "2024 Adult Compendium of Physical Activities:
//   A third update of the energy costs of human activities." J Sport Health Sci. 2024;13(1):6-12.
//   https://pacompendium.com/   ·   https://doi.org/10.1016/j.jshs.2023.10.010
//
// Every entry keeps its Compendium "specific activity code" (`code`) so the value can be checked
// against the source. MET values are copied verbatim from the 2024 tables. Note that several 2024
// values differ from the older 2011 Compendium many calculators still use
// (e.g. running 6.0–6.3 mph is now 9.3 MET, brisk walking 3.5–3.9 mph is 4.8 MET).
//
// 1 MET = the energy cost of resting quietly. Energy for a logged activity is calculated in
// `calculateMetCalories` (src/utils/calculations.ts) from the MET value, the duration and the
// user's profile (weight, height, age and sex via the Mifflin–St Jeor resting rate).
//
// To add an activity: append a row to ACTIVITY_ROWS. `id` must be unique and is stored in logs and
// favourites, so never rename an existing id.

import { Language } from '../types';

export const ACTIVITY_SOURCE = {
  label: '2024 Adult Compendium of Physical Activities (Herrmann et al., J Sport Health Sci 2024)',
  url: 'https://pacompendium.com/' as `https://${string}`,
};

export type ActivityCategory =
  | 'walking'
  | 'running'
  | 'cycling'
  | 'fitness'
  | 'mind_body'
  | 'water'
  | 'team'
  | 'racket'
  | 'combat'
  | 'dance'
  | 'outdoor'
  | 'daily'
  | 'custom'; // user-created activities (Activity → Custom), not part of the Compendium

export interface ActivityInfo {
  id: string; // stable slug saved in day logs and favourites
  code: string; // 2024 Compendium specific-activity code
  category: ActivityCategory;
  met: number; // metabolic equivalent of task
  name_en: string;
  name_it: string;
}

export const ACTIVITY_CATEGORIES: { id: ActivityCategory; en: string; it: string }[] = [
  { id: 'walking', en: 'Walking & hiking', it: 'Camminata ed escursioni' },
  { id: 'running', en: 'Running', it: 'Corsa' },
  { id: 'cycling', en: 'Cycling', it: 'Ciclismo' },
  { id: 'fitness', en: 'Gym & fitness', it: 'Palestra e fitness' },
  { id: 'mind_body', en: 'Yoga & stretching', it: 'Yoga e stretching' },
  { id: 'water', en: 'Water sports', it: 'Sport acquatici' },
  { id: 'team', en: 'Team & ball sports', it: 'Sport di squadra' },
  { id: 'racket', en: 'Racket sports', it: 'Sport con racchetta' },
  { id: 'combat', en: 'Combat sports', it: 'Sport da combattimento' },
  { id: 'dance', en: 'Dance', it: 'Danza' },
  { id: 'outdoor', en: 'Winter & outdoor', it: 'Sport invernali e outdoor' },
  { id: 'daily', en: 'Home & garden', it: 'Casa e giardino' },
  { id: 'custom', en: 'My activities', it: 'Le mie attività' },
];

type Row = [code: string, id: string, category: ActivityCategory, met: number, en: string, it: string];

const ACTIVITY_ROWS: Row[] = [
  // ---- Walking & hiking (Compendium heading 17) ----
  ['17152', 'walk-slow', 'walking', 2.8, 'Walking, slow pace, 3.2–3.9 km/h (2.0–2.4 mph)', 'Camminata lenta, 3,2–3,9 km/h'],
  ['17190', 'walk-moderate', 'walking', 3.8, 'Walking, moderate pace, 4.5–5.5 km/h (2.8–3.4 mph)', 'Camminata a passo moderato, 4,5–5,5 km/h'],
  ['17200', 'walk-brisk', 'walking', 4.8, 'Walking, brisk, 5.6–6.3 km/h (3.5–3.9 mph)', 'Camminata veloce, 5,6–6,3 km/h'],
  ['17220', 'walk-very-brisk', 'walking', 5.5, 'Walking, very brisk, 6.4–7.1 km/h (4.0–4.4 mph)', 'Camminata molto veloce, 6,4–7,1 km/h'],
  ['17230', 'walk-power', 'walking', 7.0, 'Power walking, 7.2–7.9 km/h (4.5–4.9 mph)', 'Power walking, 7,2–7,9 km/h'],
  ['17110', 'race-walk', 'walking', 6.5, 'Race walking', 'Marcia sportiva'],
  ['17302', 'nordic-walk', 'walking', 4.3, 'Nordic walking, moderate pace', 'Nordic walking, passo moderato'],
  ['17358', 'treadmill-walk', 'walking', 4.8, 'Treadmill walking, 5.6–6.3 km/h (3.5–3.9 mph)', 'Camminata sul tapis roulant, 5,6–6,3 km/h'],
  ['17165', 'dog-walk', 'walking', 3.0, 'Walking the dog', 'Passeggiata con il cane'],
  ['17100', 'walk-stroller', 'walking', 3.8, 'Walking with a stroller or with children', 'Camminata con passeggino o bambini'],
  ['17082', 'hike-easy', 'walking', 5.3, 'Hiking, normal pace over fields and hillsides', 'Escursione a passo normale su prati e colline'],
  ['17080', 'hike', 'walking', 6.0, 'Hiking, cross-country', 'Escursionismo su sentiero'],
  ['17010', 'backpacking', 'walking', 7.0, 'Backpacking', 'Trekking con zaino'],
  ['17131', 'stairs', 'walking', 6.8, 'Stair climbing, general', 'Salire le scale'],
  ['17134', 'stairs-fast', 'walking', 9.3, 'Stair climbing, fast pace', 'Salire le scale, ritmo veloce'],

  // ---- Running (heading 12) ----
  ['12020', 'jog', 'running', 7.5, 'Jogging, general', 'Jogging'],
  ['12028', 'run-6-5', 'running', 6.5, 'Running, 6.4–6.8 km/h (4.0–4.2 mph)', 'Corsa, 6,4–6,8 km/h'],
  ['12030', 'run-8', 'running', 8.5, 'Running, 8.0–8.4 km/h (5.0–5.2 mph)', 'Corsa, 8,0–8,4 km/h'],
  ['12045', 'run-9', 'running', 9.0, 'Running, 8.9–9.3 km/h (5.5–5.8 mph)', 'Corsa, 8,9–9,3 km/h'],
  ['12050', 'run-10', 'running', 9.3, 'Running, 9.7–10.1 km/h (6.0–6.3 mph)', 'Corsa, 9,7–10,1 km/h'],
  ['12060', 'run-10-8', 'running', 10.5, 'Running, 10.8 km/h (6.7 mph)', 'Corsa, 10,8 km/h'],
  ['12070', 'run-11', 'running', 11.0, 'Running, 11.3 km/h (7.0 mph)', 'Corsa, 11,3 km/h'],
  ['12090', 'run-13', 'running', 12.0, 'Running, 12.9 km/h (8.0 mph)', 'Corsa, 12,9 km/h'],
  ['12110', 'run-14-5', 'running', 13.0, 'Running, 14.5 km/h (9.0 mph)', 'Corsa, 14,5 km/h'],
  ['12120', 'run-16', 'running', 14.8, 'Running, 16.1 km/h (10 mph)', 'Corsa, 16,1 km/h'],
  ['12140', 'run-cross-country', 'running', 9.3, 'Running, cross-country', 'Corsa campestre'],
  ['12260', 'run-uphill', 'running', 13.3, 'Running uphill, 9.7 km/h (6.0 mph), 5% incline', 'Corsa in salita, 9,7 km/h, pendenza 5%'],
  ['12200', 'marathon', 'running', 13.3, 'Running, marathon', 'Corsa, maratona'],

  // ---- Cycling (heading 01) ----
  ['01010', 'bike-leisure', 'cycling', 4.0, 'Cycling, leisure, under 16 km/h (10 mph)', 'Ciclismo rilassato, sotto i 16 km/h'],
  ['01020', 'bike-light', 'cycling', 6.8, 'Cycling, 16–19 km/h (10–11.9 mph), light effort', 'Ciclismo, 16–19 km/h, sforzo leggero'],
  ['01030', 'bike-moderate', 'cycling', 8.0, 'Cycling, 19–22 km/h (12–13.9 mph), moderate effort', 'Ciclismo, 19–22 km/h, sforzo moderato'],
  ['01040', 'bike-vigorous', 'cycling', 10.0, 'Cycling, 22–26 km/h (14–15.9 mph), vigorous effort', 'Ciclismo, 22–26 km/h, sforzo intenso'],
  ['01050', 'bike-racing', 'cycling', 12.0, 'Cycling, 26–31 km/h (16–19 mph), racing', 'Ciclismo, 26–31 km/h, corsa'],
  ['01060', 'bike-fast', 'cycling', 16.8, 'Cycling, over 32 km/h (20 mph), racing', 'Ciclismo, oltre 32 km/h, corsa'],
  ['01014', 'bike-general', 'cycling', 7.0, 'Cycling, general', 'Ciclismo, generico'],
  ['01009', 'mtb', 'cycling', 8.5, 'Mountain biking, general', 'Mountain bike, generico'],
  ['01003', 'mtb-uphill', 'cycling', 14.0, 'Mountain biking, uphill, vigorous', 'Mountain bike in salita, intenso'],
  ['01084', 'ebike', 'cycling', 6.0, 'E-bike, light electric assistance', 'E-bike, assistenza elettrica leggera'],
  ['01200', 'stationary-bike', 'cycling', 6.8, 'Stationary bike, general', 'Cyclette, generico'],
  ['01214', 'stationary-bike-light', 'cycling', 4.0, 'Stationary bike, 50 W, light effort', 'Cyclette, 50 W, sforzo leggero'],
  ['01228', 'stationary-bike-moderate', 'cycling', 8.0, 'Stationary bike, 126–150 W', 'Cyclette, 126–150 W'],
  ['01236', 'stationary-bike-vigorous', 'cycling', 10.8, 'Stationary bike, 200–229 W, vigorous', 'Cyclette, 200–229 W, intenso'],
  ['01270', 'spinning', 'cycling', 9.0, 'Spinning / indoor cycling class', 'Spinning / lezione di indoor cycling'],

  // ---- Gym & fitness (heading 02) ----
  ['02000', 'aerobics', 'fitness', 7.3, 'Aerobics, general', 'Aerobica, generico'],
  ['02005', 'aerobics-low', 'fitness', 4.8, 'Aerobic dance, low impact', 'Aerobica a basso impatto'],
  ['02006', 'aerobics-high', 'fitness', 8.0, 'Aerobic dance, high impact', 'Aerobica ad alto impatto'],
  ['02002', 'step-aerobics', 'fitness', 7.3, 'Step aerobics, 15–20 cm step', 'Step, gradino 15–20 cm'],
  ['02022', 'calisthenics', 'fitness', 3.8, 'Calisthenics (push-ups, sit-ups, lunges), moderate', 'Calisthenics (flessioni, addominali, affondi), moderato'],
  ['02020', 'calisthenics-hard', 'fitness', 7.5, 'Calisthenics (push-ups, burpees, jumping jacks), vigorous', 'Calisthenics (flessioni, burpees, jumping jack), intenso'],
  ['02035', 'circuit', 'fitness', 5.0, 'Circuit training, moderate effort', 'Circuit training, sforzo moderato'],
  ['02040', 'circuit-hard', 'fitness', 7.5, 'Circuit training with kettlebells, vigorous', 'Circuit training con kettlebell, intenso'],
  ['02210', 'hiit', 'fitness', 7.0, 'High-intensity interval training, moderate effort', 'Allenamento a intervalli (HIIT), sforzo moderato'],
  ['02214', 'hiit-hard', 'fitness', 11.0, 'HIIT / Tabata (burpees, mountain climbers), vigorous', 'HIIT / Tabata (burpees, mountain climber), intenso'],
  ['02048', 'elliptical', 'fitness', 5.0, 'Elliptical trainer, moderate effort', 'Ellittica, sforzo moderato'],
  ['02049', 'elliptical-hard', 'fitness', 9.0, 'Elliptical trainer, vigorous effort', 'Ellittica, sforzo intenso'],
  ['02054', 'weights', 'fitness', 3.5, 'Weight training, general (8–15 reps)', 'Pesi, allenamento generale (8–15 ripetizioni)'],
  ['02052', 'weights-squats', 'fitness', 5.0, 'Weight training, squats and deadlifts', 'Pesi, squat e stacchi'],
  ['02050', 'weights-hard', 'fitness', 6.0, 'Weight lifting, powerlifting or bodybuilding, vigorous', 'Sollevamento pesi, powerlifting o bodybuilding, intenso'],
  ['02056', 'bodyweight', 'fitness', 3.0, 'Bodyweight resistance exercises, general', 'Esercizi a corpo libero, generico'],
  ['02057', 'bodyweight-hard', 'fitness', 6.5, 'Bodyweight resistance exercises, high intensity', 'Esercizi a corpo libero, alta intensità'],
  ['02058', 'kettlebell', 'fitness', 9.8, 'Kettlebell swings', 'Swing con kettlebell'],
  ['02060', 'gym', 'fitness', 5.5, 'Health club exercise, general', 'Allenamento in palestra, generico'],
  ['02064', 'home-workout', 'fitness', 3.8, 'Home exercise, general', 'Allenamento a casa, generico'],
  ['02143', 'workout-video', 'fitness', 4.0, 'Workout video, cardio-resistance, moderate', 'Video di allenamento, cardio e forza, moderato'],
  ['02065', 'stair-machine', 'fitness', 9.3, 'Stair-climber machine', 'Stair climber (macchina per scale)'],
  ['02068', 'jump-rope', 'fitness', 11.0, 'Jump rope', 'Corda per saltare'],
  ['02071', 'rowing-machine', 'fitness', 5.0, 'Rowing machine, under 100 W, moderate', 'Vogatore, sotto 100 W, moderato'],
  ['02072', 'rowing-machine-hard', 'fitness', 7.5, 'Rowing machine, 100–149 W, vigorous', 'Vogatore, 100–149 W, intenso'],
  ['02073', 'rowing-machine-max', 'fitness', 11.0, 'Rowing machine, 150–199 W, vigorous', 'Vogatore, 150–199 W, intenso'],
  ['02080', 'ski-machine', 'fitness', 6.8, 'Ski machine', 'Macchina per sci di fondo'],
  ['02120', 'water-aerobics', 'fitness', 5.3, 'Water aerobics', 'Acquagym'],
  ['02310', 'zumba', 'fitness', 6.5, 'Zumba, group class', 'Zumba, lezione di gruppo'],
  ['02230', 'hula-hoop', 'fitness', 5.8, 'Hula hooping', 'Hula hoop'],
  ['15700', 'trampoline', 'fitness', 6.3, 'Trampoline, recreational', 'Trampolino, ricreativo'],

  // ---- Yoga & stretching ----
  ['02101', 'stretching', 'mind_body', 2.3, 'Stretching, mild', 'Stretching leggero'],
  ['02105', 'pilates', 'mind_body', 2.8, 'Pilates, general', 'Pilates, generico'],
  ['02103', 'pilates-mat', 'mind_body', 1.8, 'Pilates, traditional mat', 'Pilates tradizionale a corpo libero'],
  ['02150', 'yoga-hatha', 'mind_body', 2.3, 'Yoga, Hatha', 'Yoga Hatha'],
  ['02185', 'yoga-vinyasa', 'mind_body', 2.7, 'Yoga, Vinyasa', 'Yoga Vinyasa'],
  ['02155', 'yoga-hot', 'mind_body', 3.0, 'Yoga, hot', 'Yoga caldo (hot yoga)'],
  ['02160', 'yoga-power', 'mind_body', 4.0, 'Yoga, power', 'Power yoga'],
  ['02180', 'sun-salutation', 'mind_body', 3.5, 'Yoga, Sun Salutation (Surya Namaskar)', 'Yoga, Saluto al Sole (Surya Namaskar)'],
  ['15670', 'tai-chi', 'mind_body', 3.3, 'Tai chi / Qi gong, general', 'Tai chi / Qi gong, generico'],

  // ---- Water sports (heading 18) ----
  ['18240', 'swim-slow', 'water', 5.8, 'Swimming laps, freestyle, slow / recreational', 'Nuoto, stile libero, lento / ricreativo'],
  ['18230', 'swim-fast', 'water', 9.8, 'Swimming laps, freestyle, fast, vigorous', 'Nuoto, stile libero, veloce, intenso'],
  ['18310', 'swim-leisure', 'water', 6.0, 'Swimming, leisurely (not laps)', 'Nuoto rilassato (non vasche)'],
  ['18265', 'swim-breaststroke', 'water', 5.3, 'Swimming, breaststroke, recreational', 'Nuoto, rana, ricreativo'],
  ['18255', 'swim-backstroke', 'water', 4.8, 'Swimming, backstroke, recreational', 'Nuoto, dorso, ricreativo'],
  ['18270', 'swim-butterfly', 'water', 13.8, 'Swimming, butterfly', 'Nuoto, farfalla'],
  ['18300', 'swim-open-water', 'water', 6.0, 'Swimming in a lake, sea or river', 'Nuoto in lago, mare o fiume'],
  ['18100', 'kayak', 'water', 5.0, 'Kayaking, moderate effort', 'Kayak, sforzo moderato'],
  ['18050', 'canoe', 'water', 5.8, 'Canoeing / rowing, 6.4–9.5 km/h, moderate effort', 'Canoa / canottaggio, 6,4–9,5 km/h, moderato'],
  ['18070', 'canoe-leisure', 'water', 3.5, 'Canoeing / rowing, for pleasure', 'Canoa / canottaggio, per piacere'],
  ['18224', 'sup', 'water', 6.5, 'Stand-up paddleboarding, general', 'Stand-up paddle (SUP), generico'],
  ['18220', 'surf', 'water', 3.0, 'Surfing, general', 'Surf, generico'],
  ['18210', 'snorkel', 'water', 5.0, 'Snorkeling', 'Snorkeling'],
  ['18208', 'scuba', 'water', 6.8, 'Scuba diving, recreational', 'Immersioni con bombole, ricreative'],
  ['18360', 'water-polo', 'water', 10.0, 'Water polo', 'Pallanuoto'],
  ['18150', 'wakeboard', 'water', 6.0, 'Water skiing / wakeboarding', 'Sci nautico / wakeboard'],
  ['18120', 'sailing', 'water', 3.0, 'Sailing / windsurfing, general', 'Vela / windsurf, generico'],

  // ---- Team & ball sports (heading 15) ----
  ['15040', 'basketball', 'team', 8.0, 'Basketball, game', 'Basket, partita'],
  ['15070', 'basketball-shooting', 'team', 5.0, 'Basketball, shooting baskets', 'Basket, tiri a canestro'],
  ['15610', 'soccer', 'team', 7.0, 'Soccer, casual', 'Calcio, amichevole'],
  ['15605', 'soccer-competitive', 'team', 9.5, 'Soccer, competitive', 'Calcio, agonistico'],
  ['15210', 'american-football', 'team', 8.0, 'American football, competitive', 'Football americano, agonistico'],
  ['15560', 'rugby', 'team', 8.3, 'Rugby, competitive', 'Rugby, agonistico'],
  ['15710', 'volleyball', 'team', 4.0, 'Volleyball, general', 'Pallavolo, generico'],
  ['15720', 'volleyball-casual', 'team', 3.0, 'Volleyball, non-competitive', 'Pallavolo, non agonistico'],
  ['15711', 'volleyball-competitive', 'team', 6.0, 'Volleyball, competitive, indoor', 'Pallavolo, agonistico, indoor'],
  ['15725', 'beach-volleyball', 'team', 8.0, 'Volleyball, beach', 'Beach volley'],
  ['15330', 'handball', 'team', 8.0, 'Team handball', 'Pallamano'],
  ['15350', 'field-hockey', 'team', 7.8, 'Field hockey', 'Hockey su prato'],
  ['15360', 'ice-hockey', 'team', 8.0, 'Ice hockey, general', 'Hockey su ghiaccio'],
  ['15460', 'lacrosse', 'team', 8.0, 'Lacrosse', 'Lacrosse'],
  ['15620', 'baseball', 'team', 5.0, 'Baseball / softball, moderate effort', 'Baseball / softball, sforzo moderato'],
  ['15150', 'cricket', 'team', 4.8, 'Cricket (batting, bowling, fielding)', 'Cricket (battuta, lancio, campo)'],
  ['15250', 'ultimate-frisbee', 'team', 8.0, 'Ultimate frisbee', 'Ultimate frisbee'],
  ['15240', 'frisbee', 'team', 3.0, 'Frisbee, casual', 'Frisbee, ricreativo'],
  ['15265', 'golf-walking', 'team', 4.3, 'Golf, walking and carrying clubs', 'Golf, a piedi con i bastoni in spalla'],
  ['15290', 'golf-cart', 'team', 3.5, 'Golf, with power cart', 'Golf, con golf cart'],
  ['15090', 'bowling', 'team', 3.0, 'Bowling', 'Bowling'],
  ['15300', 'gymnastics', 'team', 3.8, 'Gymnastics, general', 'Ginnastica artistica, generico'],

  // ---- Racket sports ----
  ['15675', 'tennis', 'racket', 6.8, 'Tennis, general, moderate effort', 'Tennis, generico, sforzo moderato'],
  ['15690', 'tennis-singles', 'racket', 8.0, 'Tennis, singles', 'Tennis, singolare'],
  ['15680', 'tennis-doubles', 'racket', 6.0, 'Tennis, doubles', 'Tennis, doppio'],
  ['15030', 'badminton', 'racket', 5.5, 'Badminton, social singles and doubles', 'Badminton, ricreativo'],
  ['15025', 'badminton-competitive', 'racket', 9.0, 'Badminton, competitive match play', 'Badminton, partita agonistica'],
  ['15660', 'table-tennis', 'racket', 4.0, 'Table tennis (ping pong)', 'Ping pong (tennis tavolo)'],
  ['15652', 'squash', 'racket', 7.3, 'Squash, general', 'Squash, generico'],
  ['15530', 'racquetball', 'racket', 7.0, 'Racquetball, general', 'Racquetball, generico'],

  // ---- Combat sports ----
  ['15110', 'boxing-bag', 'combat', 5.8, 'Boxing, punching bag', 'Boxe, sacco'],
  ['15120', 'boxing-sparring', 'combat', 7.8, 'Boxing, sparring', 'Boxe, sparring'],
  ['15100', 'boxing-ring', 'combat', 12.3, 'Boxing, in the ring', 'Boxe, sul ring'],
  ['15430', 'martial-arts', 'combat', 10.3, 'Martial arts, moderate pace (karate, taekwondo, Muay Thai…)', 'Arti marziali, ritmo moderato (karate, taekwondo, Muay Thai…)'],
  ['15425', 'martial-arts-easy', 'combat', 5.3, 'Martial arts, slower pace / beginners', 'Arti marziali, ritmo lento / principianti'],
  ['15433', 'judo', 'combat', 11.3, 'Judo', 'Judo'],
  ['15457', 'kickboxing', 'combat', 7.3, 'Kickboxing', 'Kickboxing'],
  ['15730', 'wrestling', 'combat', 6.0, 'Wrestling, competitive', 'Lotta, agonistica'],
  ['15200', 'fencing', 'combat', 6.0, 'Fencing, general', 'Scherma, generico'],

  // ---- Dance (heading 03) ----
  ['03040', 'dance-ballroom-slow', 'dance', 3.0, 'Ballroom dancing, slow (waltz, foxtrot, slow dancing)', 'Ballo liscio lento (valzer, foxtrot, ballo lento)'],
  ['03042', 'dance-ballroom', 'dance', 6.0, 'Ballroom dancing, recreational (waltz, foxtrot, cha-cha, swing)', 'Ballo da sala ricreativo (valzer, foxtrot, cha-cha, swing)'],
  ['03030', 'dance-ballroom-fast', 'dance', 5.5, 'Ballroom dancing, fast', 'Ballo da sala veloce'],
  ['03031', 'dance-club', 'dance', 9.8, 'Nightclub / folk / line dancing, vigorous', 'Discoteca / balli popolari / line dance, intenso'],
  ['03010', 'dance-ballet', 'dance', 5.0, 'Ballet, modern or jazz, class or rehearsal', 'Danza classica, moderna o jazz, lezione o prove'],
  ['03078', 'dance-jazz', 'dance', 4.5, 'Jazz dance, general', 'Jazz dance, generico'],
  ['03014', 'dance-tap', 'dance', 4.8, 'Tap dance', 'Tip tap'],
  ['03090', 'dance-salsa', 'dance', 4.8, 'Salsa dancing, with a partner', 'Salsa in coppia'],
  ['03070', 'dance-contemporary', 'dance', 3.8, 'Contemporary dance, general', 'Danza contemporanea, generico'],

  // ---- Winter & outdoor ----
  ['15533', 'climbing', 'outdoor', 8.0, 'Rock or mountain climbing', 'Arrampicata su roccia o montagna'],
  ['15537', 'climbing-easy', 'outdoor', 5.8, 'Rock climbing, low-to-moderate difficulty', 'Arrampicata, difficoltà bassa-moderata'],
  ['15534', 'bouldering', 'outdoor', 8.8, 'Bouldering', 'Bouldering'],
  ['19020', 'ice-skating-easy', 'outdoor', 5.5, 'Ice skating, 14 km/h (9 mph) or slower', 'Pattinaggio su ghiaccio, fino a 14 km/h'],
  ['19030', 'ice-skating', 'outdoor', 7.0, 'Ice skating, general', 'Pattinaggio su ghiaccio, generico'],
  ['15590', 'roller-skating', 'outdoor', 7.0, 'Roller skating', 'Pattinaggio a rotelle'],
  ['15591', 'inline-skating', 'outdoor', 7.5, 'In-line skating, 14.4 km/h (9 mph)', 'Pattinaggio in linea, 14,4 km/h'],
  ['15580', 'skateboard', 'outdoor', 5.0, 'Skateboarding, moderate effort', 'Skateboard, sforzo moderato'],
  ['19075', 'skiing', 'outdoor', 7.0, 'Skiing, general', 'Sci, generico'],
  ['19160', 'ski-downhill', 'outdoor', 6.3, 'Downhill skiing, moderate (active time only)', 'Sci alpino, moderato (solo tempo attivo)'],
  ['19201', 'snowboard', 'outdoor', 7.5, 'Snowboarding, recreational', 'Snowboard, ricreativo'],
  ['19080', 'xc-ski-slow', 'outdoor', 6.8, 'Cross-country skiing, slow (4 km/h)', 'Sci di fondo, lento (4 km/h)'],
  ['19090', 'xc-ski', 'outdoor', 8.5, 'Cross-country skiing, moderate (6.4–7.9 km/h)', 'Sci di fondo, moderato (6,4–7,9 km/h)'],
  ['19180', 'sledding', 'outdoor', 7.0, 'Sledding / tobogganing', 'Slittino'],
  ['15370', 'horse-riding', 'outdoor', 5.5, 'Horseback riding, general', 'Equitazione, generico'],

  // ---- Home & garden (headings 05, 06, 08) ----
  ['05043', 'vacuuming', 'daily', 3.0, 'Vacuuming', 'Passare l’aspirapolvere'],
  ['05030', 'house-cleaning', 'daily', 3.3, 'Cleaning the house, general', 'Pulizie di casa, generico'],
  ['05020', 'heavy-cleaning', 'daily', 3.5, 'Heavy cleaning (washing the car, cleaning the garage)', 'Pulizie pesanti (lavare l’auto, pulire il garage)'],
  ['05021', 'mopping', 'daily', 3.5, 'Mopping floors', 'Lavare i pavimenti'],
  ['05050', 'cooking', 'daily', 2.0, 'Cooking or food preparation, standing', 'Cucinare, in piedi'],
  ['05041', 'dishes', 'daily', 2.0, 'Washing dishes', 'Lavare i piatti'],
  ['05092', 'laundry', 'daily', 4.0, 'Laundry, moderate effort', 'Bucato, sforzo moderato'],
  ['05070', 'ironing', 'daily', 1.8, 'Ironing', 'Stirare'],
  ['05060', 'grocery-shopping', 'daily', 3.3, 'Grocery shopping', 'Fare la spesa'],
  ['05120', 'moving-furniture', 'daily', 5.8, 'Moving furniture, carrying boxes', 'Spostare mobili, portare scatoloni'],
  ['06160', 'painting-indoors', 'daily', 3.3, 'Painting inside the house, wallpapering', 'Imbiancare in casa, applicare carta da parati'],
  ['08066', 'gardening', 'daily', 2.0, 'Gardening, general', 'Giardinaggio, generico'],
  ['08240', 'weeding', 'daily', 4.5, 'Weeding the garden, moderate effort', 'Togliere le erbacce, sforzo moderato'],
  ['08050', 'digging', 'daily', 5.0, 'Digging / spading the garden', 'Vangare l’orto o il giardino'],
  ['08160', 'raking', 'daily', 4.0, 'Raking lawn or leaves', 'Rastrellare prato o foglie'],
  ['08120', 'mowing-walk', 'daily', 5.0, 'Mowing the lawn, walking behind a power mower', 'Tagliare l’erba, a piedi con tosaerba a motore'],
  ['08100', 'mowing-ride', 'daily', 2.5, 'Mowing the lawn, riding mower', 'Tagliare l’erba, con trattorino'],
  ['08195', 'snow-shoveling', 'daily', 5.3, 'Shoveling snow by hand, moderate effort', 'Spalare la neve a mano, sforzo moderato'],
];

export const ACTIVITY_DB: ActivityInfo[] = ACTIVITY_ROWS.map(([code, id, category, met, name_en, name_it]) => ({
  id,
  code,
  category,
  met,
  name_en,
  name_it,
}));

const ACTIVITY_BY_ID = new Map(ACTIVITY_DB.map((a) => [a.id, a]));

export const getActivityById = (id: string | undefined): ActivityInfo | undefined =>
  id ? ACTIVITY_BY_ID.get(id) : undefined;

export const CUSTOM_ACTIVITY_PREFIX = 'custom:';

/** Turns a saved custom activity into a searchable row (id is prefixed so it never collides with Compendium ids). */
export const customActivityToInfo = (c: { id: string; name: string; met: number }): ActivityInfo => ({
  id: `${CUSTOM_ACTIVITY_PREFIX}${c.id}`,
  code: '',
  category: 'custom',
  met: c.met,
  name_en: c.name,
  name_it: c.name,
});

export const activityName = (activity: ActivityInfo, lang: Language): string =>
  lang === 'it' ? activity.name_it : activity.name_en;

export const categoryLabel = (category: ActivityCategory, lang: Language): string => {
  const entry = ACTIVITY_CATEGORIES.find((c) => c.id === category);
  return entry ? (lang === 'it' ? entry.it : entry.en) : category;
};
