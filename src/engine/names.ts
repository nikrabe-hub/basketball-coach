import { CONFIG } from './config';
import type { Rng } from './rng';

/**
 * Namensgenerator: internationale Mischung aus Vor- und Nachnamen.
 * Die Listen sind frei gewählt. Zusätzlich verhindert eine Sperrliste,
 * dass zufällig der Name eines bekannten echten Spielers entsteht.
 */

type Region = 'usa' | 'europa' | 'afrika' | 'lateinamerika' | 'ozeanien' | 'asien';
const REGIONEN: readonly Region[] = ['usa', 'europa', 'afrika', 'lateinamerika', 'ozeanien', 'asien'];

interface RegionDaten {
  vornamen: readonly string[];
  nachnamen: readonly string[];
  laender: readonly string[];
}

const DATEN: Record<Region, RegionDaten> = {
  usa: {
    vornamen: [
      'Marcus', 'Tyrell', 'Jalen', 'Devon', 'Cameron', 'Isaiah', 'Malik', 'Darius', 'Trevor', 'Caleb',
      'Brandon', 'Elijah', 'Jordan', 'Xavier', 'Terrence', 'Nathan', 'Quincy', 'Reggie', 'Dante', 'Shawn',
      'Austin', 'Brody', 'Colton', 'Dwight', 'Evan', 'Garrett', 'Hunter', 'Jamal', 'Keenan', 'Lamar',
      'Mason', 'Nolan', 'Omari', 'Preston', 'Rashad', 'Spencer', 'Tobias', 'Wesley', 'Zane', 'Cedric',
    ],
    nachnamen: [
      'Whitfield', 'Holloway', 'Prescott', 'Calloway', 'Hendricks', 'Pruitt', 'Dawkins', 'Mercer', 'Strickland', 'Banks',
      'Fontaine', 'Gaines', 'Hartwell', 'Jennings', 'Kirkland', 'Lockett', 'McBride', 'Norwood', 'Overton', 'Pickett',
      'Rutledge', 'Sampson', 'Tolliver', 'Underwood', 'Vance', 'Wilkerson', 'Yates', 'Abernathy', 'Beckett', 'Cobb',
      'Dunleavy', 'Ellison', 'Fairbanks', 'Goodwin', 'Haskins', 'Irvin', 'Kessler', 'Langford', 'Maddox', 'Nash',
      'Orton', 'Pennington', 'Quarles', 'Redmond', 'Stallworth', 'Treadwell', 'Upshaw', 'Voss', 'Whitaker', 'Ziegler',
    ],
    laender: ['USA'],
  },
  europa: {
    vornamen: [
      'Luka', 'Marko', 'Nikola', 'Stefan', 'Milan', 'Dario', 'Ante', 'Bojan', 'Matej', 'Jonas',
      'Tomas', 'Lukas', 'Paul', 'Felix', 'Maxime', 'Theo', 'Hugo', 'Enzo', 'Marco', 'Matteo',
      'Pablo', 'Alvaro', 'Sergio', 'Nikos', 'Giorgos', 'Dimitri', 'Aleksei', 'Ivan', 'Emil', 'Rasmus',
      'Mikkel', 'Jakub', 'Filip', 'Andrej', 'Viktor', 'Leon',
    ],
    nachnamen: [
      'Petrovic', 'Jovanovic', 'Kovacevic', 'Horvat', 'Babic', 'Novak', 'Kral', 'Dvorak', 'Lindqvist', 'Andersen',
      'Bergmann', 'Hartmann', 'Kessler', 'Lehmann', 'Vogel', 'Brandt', 'Dubois', 'Lefevre', 'Moreau', 'Garnier',
      'Rossetti', 'Bellandi', 'Morante', 'Navarro', 'Castellar', 'Ibarra', 'Villalba', 'Papadakis', 'Nikolaidis', 'Volkov',
      'Sokolov', 'Zielinski', 'Wozniak', 'Kalnins', 'Jankauskas', 'Mikalauskas',
    ],
    laender: [
      'Serbien', 'Kroatien', 'Slowenien', 'Frankreich', 'Deutschland', 'Spanien', 'Italien', 'Griechenland',
      'Litauen', 'Lettland', 'Türkei', 'Dänemark', 'Schweden', 'Tschechien', 'Polen', 'Montenegro',
    ],
  },
  afrika: {
    vornamen: [
      'Emeka', 'Chidi', 'Tunde', 'Kwame', 'Kofi', 'Yaw', 'Mamadou', 'Ousmane', 'Cheikh', 'Ibrahima',
      'Samuel', 'Daniel', 'Joseph', 'Abdoulaye', 'Moussa', 'Amadou', 'Jean-Claude', 'Patrice', 'Boubacar', 'Femi',
      'Obinna', 'Kelechi', 'Deng', 'Majok', 'Thabo', 'Sipho',
    ],
    nachnamen: [
      'Okafor', 'Adeyemi', 'Nwosu', 'Balogun', 'Mensah', 'Boateng', 'Asante', 'Diallo', 'Ndiaye', 'Sarr',
      'Fall', 'Cisse', 'Traore', 'Keita', 'Mbeki', 'Dlamini', 'Nkosi', 'Tchamba', 'Essomba', 'Fofana',
      'Kamara', 'Bangura', 'Wol', 'Garang', 'Mabior', 'Okonkwo',
    ],
    laender: ['Nigeria', 'Ghana', 'Senegal', 'Kamerun', 'Mali', 'Südsudan', 'Südafrika', 'Elfenbeinküste', 'Kongo'],
  },
  lateinamerika: {
    vornamen: [
      'Mateo', 'Santiago', 'Joaquin', 'Facundo', 'Rodrigo', 'Gustavo', 'Leandro', 'Thiago', 'Rafael', 'Gabriel',
      'Diego', 'Esteban', 'Nicolas', 'Camilo', 'Julian', 'Andres', 'Emilio', 'Ramiro', 'Bruno', 'Lucas',
      'Felipe', 'Ignacio', 'Alejandro', 'Cristian', 'Marcelo', 'Renato',
    ],
    nachnamen: [
      'Fernandez', 'Gutierrez', 'Herrera', 'Montoya', 'Paredes', 'Quintero', 'Restrepo', 'Salazar', 'Vargas', 'Zapata',
      'Barrios', 'Cabrera', 'Duarte', 'Escobar', 'Fuentes', 'Guerrero', 'Ledesma', 'Maldonado', 'Ocampo', 'Pacheco',
      'Rojas', 'Sandoval', 'Teixeira', 'Albuquerque', 'Carvalho', 'Nascimento',
    ],
    laender: ['Argentinien', 'Brasilien', 'Kolumbien', 'Venezuela', 'Dominikanische Republik', 'Puerto Rico', 'Uruguay', 'Mexiko'],
  },
  ozeanien: {
    vornamen: [
      'Jack', 'Liam', 'Callum', 'Riley', 'Harrison', 'Flynn', 'Mitchell', 'Hamish', 'Angus', 'Lachlan',
      'Tane', 'Manu', 'Josh', 'Dane', 'Brayden', 'Kieran', 'Ethan', 'Cooper', 'Declan', 'Zac',
    ],
    nachnamen: [
      'McAllister', 'Fitzgerald', 'Thackeray', 'Blackwood', 'Ridgeway', 'Kingsley', 'Sinclair', 'Hargreaves', 'Whitlock', 'Tupou',
      'Faleolo', 'Leota', 'Tuilagi', 'Pomare', 'Rangihuna', 'Callahan', 'Drummond', 'Gallagher', 'Kerrigan', 'Mulholland',
    ],
    laender: ['Australien', 'Neuseeland'],
  },
  asien: {
    vornamen: [
      'Haruto', 'Kenji', 'Takumi', 'Ryo', 'Daichi', 'Minjun', 'Seojun', 'Jiho', 'Wei', 'Jun',
      'Hao', 'Chen', 'Arjun', 'Rohan', 'Karan', 'Reza', 'Omid', 'Farid', 'Nuri', 'Tariq',
    ],
    nachnamen: [
      'Tanabe', 'Morikawa', 'Hasegawa', 'Fujimoto', 'Okabe', 'Seo', 'Baek', 'Jeong', 'Liang', 'Zhou',
      'Wen', 'Gao', 'Mehta', 'Kapoor', 'Chauhan', 'Rahimi', 'Karimi', 'Nazari', 'Haddad', 'Mansour',
    ],
    laender: ['Japan', 'Südkorea', 'China', 'Indien', 'Iran', 'Libanon', 'Philippinen'],
  },
};

/**
 * Sperrliste: Namen bekannter echter Spieler (ohne Akzente, klein geschrieben).
 * Diese Kombinationen werden nie erzeugt.
 */
const SPERRLISTE_ROH = [
  'LeBron James', 'Stephen Curry', 'Kevin Durant', 'Giannis Antetokounmpo', 'Nikola Jokic', 'Luka Doncic',
  'Joel Embiid', 'Jayson Tatum', 'Jimmy Butler', 'Kawhi Leonard', 'Anthony Davis', 'Damian Lillard',
  'Devin Booker', 'Ja Morant', 'Trae Young', 'Zion Williamson', 'Victor Wembanyama', 'Anthony Edwards',
  'Kyrie Irving', 'James Harden', 'Russell Westbrook', 'Chris Paul', 'Dirk Nowitzki', 'Michael Jordan',
  'Kobe Bryant', 'Shaquille ONeal', 'Tim Duncan', 'Magic Johnson', 'Larry Bird', 'Wilt Chamberlain',
  'Bill Russell', 'Hakeem Olajuwon', 'Allen Iverson', 'Dwyane Wade', 'Kevin Garnett', 'Scottie Pippen',
  'Charles Barkley', 'Karl Malone', 'John Stockton', 'Patrick Ewing', 'David Robinson', 'Steve Nash',
  'Paul Pierce', 'Ray Allen', 'Vince Carter', 'Tracy McGrady', 'Dennis Rodman', 'Isiah Thomas',
  'Klay Thompson', 'Draymond Green', 'Paul George', 'Donovan Mitchell', 'Bam Adebayo', 'Rudy Gobert',
  'Domantas Sabonis', 'Kristaps Porzingis', 'Pau Gasol', 'Marc Gasol', 'Tony Parker', 'Manu Ginobili',
  'Dennis Schroder', 'Franz Wagner', 'Moritz Wagner', 'Jalen Brunson', 'Tyrese Haliburton', 'Paolo Banchero',
  'Chet Holmgren', 'Jaylen Brown', 'Bradley Beal', 'Chris Bosh', 'Carmelo Anthony', 'Derrick Rose',
  'Blake Griffin', 'Kemba Walker', 'Jrue Holiday', 'Kyle Lowry', 'Pascal Siakam', 'Jalen Williams',
  'Jaren Jackson', 'Darius Garland', 'Cade Cunningham', 'Evan Mobley', 'Scottie Barnes', 'Alperen Sengun',
  'Josh Giddey', 'Patty Mills', 'Ben Simmons', 'Andrew Wiggins', 'Dillon Brooks', 'Marcus Smart',
  'Jamal Murray', 'Michael Porter', 'Aaron Gordon', 'Bogdan Bogdanovic', 'Bojan Bogdanovic', 'Goran Dragic',
  'Dario Saric', 'Vlatko Cancar', 'Luol Deng', 'Joakim Noah', 'Serge Ibaka', 'Hassan Whiteside',
  'Dikembe Mutombo', 'Yao Ming', 'Jeremy Lin', 'Rui Hachimura', 'Yuta Watanabe', 'Deandre Ayton',
];

function normalisiere(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z ]/g, '')
    .toLowerCase()
    .trim();
}

const SPERRLISTE: ReadonlySet<string> = new Set(SPERRLISTE_ROH.map(normalisiere));

export function istGesperrt(vorname: string, nachname: string): boolean {
  return SPERRLISTE.has(normalisiere(`${vorname} ${nachname}`));
}

export interface ErzeugterName {
  vorname: string;
  nachname: string;
  nationalitaet: string;
}

/** Erzeugt Namen, die in der Liga eindeutig und nicht gesperrt sind. */
export class NamenGenerator {
  private readonly benutzt = new Set<string>();

  erzeuge(rng: Rng): ErzeugterName {
    const gewichte = REGIONEN.map((r) => CONFIG.generator.regionGewichte[r]);
    for (let versuch = 0; versuch < 200; versuch++) {
      const region = REGIONEN[rng.gewichtet(gewichte)] as Region;
      const d = DATEN[region];
      const vorname = rng.pick(d.vornamen);
      const nachname = rng.pick(d.nachnamen);
      const schluessel = normalisiere(`${vorname} ${nachname}`);
      if (this.benutzt.has(schluessel) || SPERRLISTE.has(schluessel)) continue;
      this.benutzt.add(schluessel);
      return { vorname, nachname, nationalitaet: rng.pick(d.laender) };
    }
    throw new Error('Kein freier Name gefunden (Namenslisten zu klein).');
  }
}
