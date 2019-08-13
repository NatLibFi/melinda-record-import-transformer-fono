/**
*
* @licstart  The following is the entire license notice for the JavaScript code in this file.
*
* Fono record transformer for the Melinda record batch import system
*
* Copyright (C) 2019 University Of Helsinki (The National Library Of Finland)
*
* This file is part of melinda-record-import-transformer-fono
*
* melinda-record-import-transformer-fono program is free software: you can redistribute it and/or modify
* it under the terms of the GNU Affero General Public License as
* published by the Free Software Foundation, either version 3 of the
* License, or (at your option) any later version.
*
* melinda-record-import-transformer-fono is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU Affero General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License
* along with this program.  If not, see <http://www.gnu.org/licenses/>.
*
* @licend  The above is the entire license notice
* for the JavaScript code in this file.
*
*/

/* eslint max-params: ['error', 5], capitalized-comments: ['off']  */
/* eslint-disable capitalized-comments, no-warning-comments */

import moment from 'moment';
import getStream from 'get-stream';
import {MarcRecord} from '@natlibfi/marc-record';
import {Utils} from '@natlibfi/melinda-commons';

const {createLogger} = Utils;
// console.log('--------------------');

export default async function (stream) {
	MarcRecord.setValidationOptions({subfieldValues: false});

	const Logger = createLogger();
	// This is replaced with development dummy data input below
	// const records = await JSON.parse(await getStream(stream));
	const records = await inputTestData(stream);

	// This is custom part
	// console.log('--------------------');
	// console.log(records);
	// console.log('--------------------');
	// End of custom part

	// const codes = new Map([
	// 	[/^KAB\b/i, '78.742'],
	// 	[/^KAF\b/i, '78.812'],
	// 	[/^KAG\b/i, '78.65'],
	// 	[/^KAH\b/i, '78.66'],
	// 	[/^KAK\b/i, '78.822'],
	// 	[/^KAP\b/i, '78.61'],
	// 	[/^KAR\b/i, '78.871'],
	// 	[/^KAS\b/i, '78.822'],
	// 	[/^KAT\b/i, '78.852'],
	// 	[/^KAV\b/i, '78.712'],

	// 	[/^KKL\b/i, '78.3414'],
	// 	[/^KKM\b/i, '78.3412'],
	// 	[/^KKN\b/i, '78.3413'],
	// 	[/^KKP\b/i, '78.3414'],
	// 	[/^KKQ\b/i, '78.3411'],
	// 	[/^KKT\b/i, '78.3414'],
	// 	[/^KKU\b/i, '78.3414'],

	// 	[/^KO\b/i, '78.54'],
	// 	[/^KOC\b/i, '78.52'],
	// 	[/^KOF\b/i, '78.54'],
	// 	[/^KOJ\b/i, '78.521'],
	// 	[/^KOW\b/i, '78.53'],

	// 	[/^KW\b/i, '78.51']
	// ]);

	Logger.log('debug', `Starting conversion of ${records.length} records...`);
	return Promise.all(records.map(convertRecord));

	function convertRecord(record) {
		let marcRecord = new MarcRecord();
		let fonoMap = new Map([]);
		let leader000 = [];
		let control007 = [];
		let control008 = [];

		record = record.replace(/\r\n$/, ''); // Remove possible extra linebreaks at end of string
		let lines = record.split(/[\r\n]+/).filter(n => n); // Split each line to array. Remove first
		lines.shift(); // Remove first, seems to be index not used in transformation
		lines.map(generateMapLine);
		appendMap(fonoMap);

		handleLeader(fonoMap, marcRecord, Logger);
		handle001(fonoMap, marcRecord, Logger); // Ok
		handle002(fonoMap, Logger, leader000); // Seems to originate from index 8 of input (9th char) //This checks records type (main/sub) and sets boolean main
		handle102and104(fonoMap, marcRecord, Logger, control007, control008); // ToDo: Voyager clause not checked //This dictates how 102 is handled
		handle103(fonoMap, marcRecord, Logger); // Ok
		handle112(fonoMap, marcRecord, Logger); // Ok
		handle120(fonoMap, marcRecord, Logger); // ToDo: How data is supposed to be parsed from input? Complex
		handle130(fonoMap, marcRecord, Logger); // 06 Weird ' -' in the end of subfields in expected
		handle140(fonoMap, marcRecord, Logger); // 08 Reworked solution, needs testing, connected to 140, ToDo: Viola
		handle141(fonoMap, marcRecord, Logger); // Ok
		handle150(fonoMap, marcRecord, Logger); // ToDo: inconsistency with 505 and 245 // _Tämä on oikeastaan niin monimutkainen, ettei sitä voi kunnolla speksata, vaan pitää reverse engineerata..._
		handle151(fonoMap, marcRecord, Logger); // Ok
		handle162(fonoMap, marcRecord, Logger);
		handle170(fonoMap, marcRecord, Logger, control008);
		handle175(fonoMap, marcRecord, Logger); // Ok
		handle180(fonoMap, marcRecord, Logger); // Ok
		handle190and191(fonoMap, marcRecord, Logger); // 08 Reworked solution, needs testing, connected to 140
		handle200(fonoMap, marcRecord, Logger); // Do this
		handle222(fonoMap, marcRecord, Logger, control008); // Check xxxx-xxxx & xxxx&xxxx & xxxx& cases, only detects first
		handle223and225(fonoMap, Logger, control008); // Ok
		handle224(fonoMap, marcRecord, Logger, control008); // Ok
		// handle228(); // NV: tätä ei enää käytetä
		handle230(fonoMap, marcRecord, Logger);
		handle243(fonoMap, marcRecord, Logger);
		handle244(fonoMap, marcRecord, Logger, control008);

		return marcRecord;

		function handleLeader() {

		}

		function generateMapLine(line) {
			let ind = line.substr(0, 3);
			line = line.substr(3);

			if (fonoMap.has(ind)) {
				let arr = fonoMap.get(ind);
				arr.push(line);
				fonoMap.set(ind, arr);
			} else {
				fonoMap.set(ind, [line]);
			}
		}
	}
}

export function appendMap(fonoMap) {
	fonoMap.exists = function (ind) {
		if (fonoMap.has(ind)) {
			return true;
		}

		return false;
	};

	fonoMap.getSingle = function (ind) {
		if (fonoMap.has(ind)) {
			let data = fonoMap.get(ind);
			if (data.length === 1) {
				return data[0];
			}
		}

		return false;
	};

	fonoMap.getAll = function (ind) {
		if (fonoMap.has(ind)) {
			return fonoMap.get(ind);
		}

		return false;
	};

	fonoMap.getAllCombined = function (ind) {
		const dataAll = fonoMap.getAll(ind);
		if (dataAll) {
			let data = '';
			dataAll.forEach(line => {
				if (data.length === 0 || line.match(/^\s/) || data.match(/\s$/)) {
					data += line;
				} else {
					data = data + ' ' + line;
				}
			});
			return data;
		}

		return dataAll;
	};

	const data002 = fonoMap.getSingle('002');
	const main = (data002 && data002.charAt(8) === '1');
	fonoMap.main = function () {
		return main;
	};
}

// Esimerkkitietueen läpikäynti
// '001' => '+45S-012412             KTV2016 TM1000             L4',	// vain teokset, muotoa mmm:ss (005:00, 151:12)
// '002' => '201704051PV2017', 											// 1 = äänite, 2 = teos
// '100' => '<TE=Koko äänite; 45S-012412*.KART.>, 						// Ei speksissä
// '101' => '+45S',														// Ei speksissä
// '102' => '012412', 													// kuusi numeroa, käsittely riippuu kentästä 104
// '104' => '45rpm',													// Ks. kentän 102 konversio!
// '105' => 'Fono',														// Ei speksissä
// '111' => 'TM1000',													// Ei speksissä
// '112' => 'TV2016'													// Ei speksissä
// '130' => 'QUEEN OF HELL',											// Äänitetason
// '151' => 'Queen of hell.  665.  Foes to fire.  Rise of the deth.',	// Teoshuomautus	voi olla monta riviä, jatkuu riviltä toiselle
// '170' => 'L4 L4A',													// 170	Laji	L-alkuinen koodi
// '190' => 'Iron Magazine (yhtye).',									// 190	Esittäjät	voi olla monta riviä, jatkuu riviltä toiselle, emoissa 1. rivi käsitellään erikseen
// '191' => 'syntetisaattori).',										// 191	Muut esittäjät	voi olla monta riviä, jatkuu riviltä toiselle yleensä ensin 190, joskus 191 yksinään
// '200' => 'englanti',									// Esityskieli
// '223' => 'PM1000',									// Julkaisumaa
// '222' => 'PV2017',									// Julkaisuvuosi	PVyyyy
// '227' => 'E', 										// Ei speksissä
// '228' => 'HV2017',									// Äänitteen hankintavuosi	HVyyyy
// '230' => 'KRYPT112',									// 230	Kaupallinen tunnus
// '244' => 'Tekstilehtinen.',							// Oheistieto
// '246' => '1150'  									// Ei speksissä

// Lisäksi speksissä muunnoslogiikat kentille, jotka eivät esiinny esimerkkitietueessa:
// 103	uranumero	vain teokset
// 140	Tekijä			voi olla monta riviä, jatkuu riviltä toiselle
// 141	Tekijähuomautus	voi olla monta riviä, jatkuu riviltä toiselle
// 150	Teos	voi olla monta riviä, jatkuu riviltä toisell
// 162	Sävellysvuosi	SVyyyy
// 175	Lajitarkennus
// 180	Aihepiiri
// 224	Uudelleenjulkaisuvuosi	RVyyyy
// 225	Uudelleenjulkaisumaa	RMxxxx
// 243	ISRC	vain teokset, 12-merkkinen koodi

export function handle001(fonoMap, marcRecord, Logger) {
	const data001 = fonoMap.getSingle('001');
	if (data001 === false) {
		Logger.log('error', '001 field: does not exist, or multiple fields');
		return '';
	}

	// 306 ## $a hhmmss (esim. 000500, 023112)
	// Input teos:   +45S-012412-A01   003:54KTV2016 TM1000             L4A     KM1 KS
	// Input aanite: +LPS-073845             KTV2015 TM1000             L5      KI KZ3S
	// Check if duration is found from data
	let data = data001.match(/[0-9]{3}:[0-5][0-9]/);

	if (data) {
		let dur = moment.utc(moment.duration({
			seconds: data[0].substr(4),
			minutes: data[0].substr(0, 3)
		}).as('milliseconds')).format('HHmmss');

		marcRecord.insertField({
			tag: '306',
			ind1: '',
			ind2: '',
			subfields: [{
				code: 'a',
				value: dur
			}]
		});
	}
}

// Seems to originate from index 8 of input: (9th char)
// Input '201704051PV2017'
export function handle002(fonoMap, Logger, leader000) {
	const data002 = fonoMap.getSingle('002');
	if (data002 === false) {
		Logger.log('error', '002 field: does not exist, or multiple fields');
		return;
	}

	// 1 -> 000/06-07 jm, 2 -> 000/06-07 ja
	if (data002.charAt(8) === '1') {
		leader000.push({ind: 6, val: 'j'}, {ind: 7, val: 'm'});
	} else if (data002.charAt(8) === '2') {
		leader000.push({ind: 6, val: 'j'}, {ind: 7, val: 'a'});
	} else {
		Logger.log('error', `Invalid 002 field: ${data002} - index 8 should be 1 or 2, is: ${data002.charAt(8)}`);
	}
}

// Huomaa, että Voyageriin viedessä viennin jälkeen on ajettu fono_relink.perl, joka korvaa emojen 035$a:n ja
// poikastaen 773$w tietokannan oikealla id:llä. Jos v98* tai v81*, niin myös tämä arvo on jätetty emon
// 035$a-kenttään. (v98 jätetään saapumisvalvonnan ja v81 jonkun mahdollisen Mikkelin digitointiseurantatarpeen takia.)

// isOnlineMaterial(input) <- used in new spec to detect special case
export function handle102and104(fonoMap, marcRecord, Logger, control007, control008) {
	const data102 = fonoMap.getSingle('102');
	const data104 = fonoMap.getSingle('104');
	if (data102 === false && data104 === false) {
		Logger.log('error', '102 or 104 field: does not exist, or multiple fields');
		return;
	}

	let tag = null;
	let code = null;

	if (fonoMap.main()) {
		tag = '035';
		code = 'a';
	} else {
		tag = '773';
		code = 'w';
	}

	switch (data104) {
		case 'CD': {
			// Emot: 035 ## $a v81xxxxxx
			// osakohteet: 773 ## $w v81xxxxxx
			marcRecord.insertField({
				tag: tag,
				ind1: '',
				ind2: '',
				subfields: [{
					code: code,
					value: 'v81' + data102
				}]
			});

			// Lisäksi emoon:
			if (fonoMap.main()) {
				// 007/00 s, 007/01/ d, 007/03 f, 007/06 g, 007/10 m
				control007.push({ind: 0, val: 's'}, {ind: 1, val: 'd'}, {ind: 3, val: 'f'}, {ind: 6, val: 'g'}, {ind: 10, val: 'm'});

				// 300 ## $a 1 CD-äänilevy.
				marcRecord.insertField({
					tag: '300',
					ind1: '',
					ind2: '',
					subfields: [{
						code: 'a',
						value: '1 CD-äänilevy'
					}]
				});

				// 338 ## $a äänilevy $b sd $2 rdacarrier
				insert338('äänilevy', 'sd');
			}

			return;
		}

		case '33rpm.': {
			// Emot: 035 ## $a v95xxxxxx
			// osakohteet: 773 ## $w v95xxxxxx
			marcRecord.insertField({
				tag: tag,
				ind1: '',
				ind2: '',
				subfields: [{
					code: code,
					value: 'v95' + data102
				}]
			});

			// Lisäksi emoon:
			if (fonoMap.main()) {
				// 007/00 s, 007/01 d, 007/03 b, 007/06 e, 007/10 p
				control007.push({ind: 0, val: 's'}, {ind: 1, val: 'd'}, {ind: 3, val: 'b'}, {ind: 6, val: 'e'}, {ind: 10, val: 'p'});

				// Emoon 300 ## $a 1 äänilevy.
				marcRecord.insertField({
					tag: '300',
					ind1: '',
					ind2: '',
					subfields: [{
						code: 'a',
						value: '1 äänilevy.'
					}]
				});

				// 338 ## $a äänilevy $b sd $2 rdacarrier
				insert338('äänilevy', 'sd');

				// 344 ## $c 33 1/3 kierr./min
				marcRecord.insertField({
					tag: '344',
					ind1: '',
					ind2: '',
					subfields: [{
						code: 'c',
						value: '33 1/3 kierr./min'
					}]
				});
			}

			return;
		}

		case '45rpm.': {
			// Emot: 035 ## $a v96xxxxxx
			// osakohteet: 773 ## $w v96xxxxxx
			marcRecord.insertField({
				tag: tag,
				ind1: '',
				ind2: '',
				subfields: [{
					code: code,
					value: 'v96' + data102
				}]
			});

			// Lisäksi emoon:
			if (fonoMap.main()) {
				// 007/00 s, 007/01 d, 007/03 c, 007/06 c, 007/10 p
				control007.push({ind: 0, val: 's'}, {ind: 1, val: 'd'}, {ind: 3, val: 'c'}, {ind: 6, val: 'c'}, {ind: 10, val: 'p'});

				// Emoon 300 ## $a 1 äänilevy : $b 45 kierr./min.
				marcRecord.insertField({
					tag: '300',
					ind1: '',
					ind2: '',
					subfields: [{
						code: 'a',
						value: '1 CD-äänilevy'
					}]
				});

				// 338 ## $a äänilevy $b sd $2 rdacarrier
				insert338('äänilevy', 'sd');

				// 344 ## $c 45 kierr./min
				marcRecord.insertField({
					tag: '344',
					ind1: '',
					ind2: '',
					subfields: [{
						code: 'c',
						value: '45 kierr./min'
					}]
				});
			}

			return;
		}

		case 'Nauha': {
			// Emot: 035 ## $a v80xxxxxx
			// osakohteet: 773 ## $w v80xxxxxx
			marcRecord.insertField({
				tag: tag,
				ind1: '',
				ind2: '',
				subfields: [{
					code: code,
					value: 'v80' + data102
				}]
			});

			// Lisäksi emoon:
			if (fonoMap.main()) {
				// 007/00 s, 007/01 s, 007/03 l, 007/06 j, 007/10 p +
				control007.push({ind: 0, val: 's'}, {ind: 1, val: 's'}, {ind: 3, val: 'l'}, {ind: 6, val: 'j'}, {ind: 10, val: 'p'});

				// Emoon 300 $a 1 C-kasetti.
				if (fonoMap.main()) {
					marcRecord.insertField({
						tag: '300',
						ind1: '',
						ind2: '',
						subfields: [{
							code: 'a',
							value: '1 C-kasetti.'
						}]
					});
				}
			}

			return;
		}

		case '78': {
			// Emot: 035 ## $a v97xxxxxx
			// osakohteet: 773 ## $w v97xxxxxx
			marcRecord.insertField({
				tag: tag,
				ind1: '',
				ind2: '',
				subfields: [{
					code: code,
					value: 'v97' + data102
				}]
			});

			// Lisäksi emoon:
			if (fonoMap.main()) {
				// 007/00 s, 007/01 d, 007/03 d, 007/06 d, 007/10 |
				control007.push({ind: 0, val: 's'}, {ind: 1, val: 'd'}, {ind: 3, val: 'd'}, {ind: 6, val: 'd'}, {ind: 10, val: '|'});

				// 300 ## $a 1 äänilevy
				marcRecord.insertField({
					tag: '300',
					ind1: '',
					ind2: '',
					subfields: [{
						code: 'a',
						value: '1 äänilevy'
					}]
				});

				// 344 ## $c 78 kierr./min
				marcRecord.insertField({
					tag: '344',
					ind1: '',
					ind2: '',
					subfields: [{
						code: 'b',
						value: '78 kierr./min.'
					}]
				});
			}

			return;
		}

		case 'Audiofile': {
			// Emot: 035 ## $a v98xxxxxx
			// osakohteet: 773 ## $w v98xxxxxx
			marcRecord.insertField({
				tag: tag,
				ind1: '',
				ind2: '',
				subfields: [{
					code: code,
					value: 'v98' + data102
				}]
			});

			// Jos Fonon 246 on verkkoaineistokoodi, niin
			if (isOnlineMaterial()) {
				// 006 m||||| o||h||||||||
				marcRecord.insertField({
					tag: '006',
					value: 'm||||| o||h||||||||'
				});

				// 007/00 s, 007/01 r, 007/03-12 |n|||||||||
				control007.push({ind: 0, val: 's'}, {ind: 1, val: 'r'}, {ind: 3, val: '|'}, {ind: 4, val: 'n'},
					{ind: 5, val: '|'}, {ind: 6, val: '|'}, {ind: 7, val: '|'}, {ind: 8, val: '|'},
					{ind: 9, val: '|'}, {ind: 10, val: '|'}, {ind: 11, val: '|'}, {ind: 12, val: '|'});

				// ToDo: 008/23 o (vrt. VIOLA-55 - Authenticate to see issue details  )

				// 337 ## $a tietokonekäyttöinen $b c $2 rdamedia
				marcRecord.insertField({
					tag: '300',
					ind1: '',
					ind2: '',
					subfields: [{
						code: 'a',
						value: 'tietokonekäyttöinen'
					}, {
						code: 'b',
						value: 'c'
					}, {
						code: '2',
						value: 'rdamedia'
					}]
				});

				// 338 ## $a verkkoaineisto $b cr $2 rdacarrier
				insert338('verkkoaineisto', 'cr');

				// 347 ## $a äänitiedosto
				marcRecord.insertField({
					tag: 347,
					ind1: '',
					ind2: '',
					subfields: [{
						code: 'a',
						value: 'äänitiedosto'
					}]
				});

			// Muuten
			} else {
				// 007/00 s, 007/01 d 007/03 f, 007/06 g, 007/10 m
				control007.push({ind: 0, val: 's'}, {ind: 1, val: 'd'}, {ind: 3, val: 'f'}, {ind: 6, val: 'g'}, {ind: 10, val: 'm'});

				// 008/24 välilyönti
				insertToControl(control008, 24, 1, ' ');

				// 300 ## $a 1 CD-äänilevy.
				marcRecord.insertField({
					tag: '300',
					ind1: '',
					ind2: '',
					subfields: [{
						code: 'a',
						value: '1 äänilevy'
					}]
				});

				// 338 ## $a äänilevy $b sd $2 rdacarrier
				insert338('äänilevy', 'sd');
			}

			return;
		}

		default: {
			Logger.log('error', `104 field: value not identified '${data104}'`);
			break;
		}
	}

	function insert338(subfieldA, subfieldB = 'sd') {
		marcRecord.insertField({
			tag: '338',
			ind1: '',
			ind2: '',
			subfields: [{
				code: 'a',
				value: subfieldA
			}, {
				code: 'b',
				value: subfieldB
			}, {
				code: '2',
				value: 'rdacarrier'
			}]
		});
	}
}

export function handle103(fonoMap, marcRecord, Logger) {
	if (!fonoMap.main()) {
		const data103 = fonoMap.getSingle('103');
		if (data103 === false) {
			Logger.log('error', '103 field: does not exist, or multiple fields');
			return;
		}

		let data = data103.replace(/(0*)([1-9])/g, '$2'); // Remove leading zeroes
		const range = data.split(/-/).filter(n => n);
		let ends = [];

		range.every(end => {
			let d = end.split(/^(?:([A-Z0-9]+):0?([0-9]+))|(?:([A-Z]*)0?([0-9]+))$/i).filter(n => n);
			ends.push(d); // Split to one value or to two value pairs (after filtering undefined and empty)
			return true;
		});

		let discs = ends[0].length > 1 ? 1 : 0; // Check if there is disc info
		const hasSides = Boolean(discs > 0 && ends[0][0].match(/^\D$/)); // Check if there is 'A-puoli' or 'B-puoli'

		if (discs !== 0) { // If there is disc info, calculate how many disc actually
			let curDisc = ends[0][0];
			ends.forEach(e => {
				if (e[0] !== curDisc) {
					discs++;
				}

				curDisc = e[0];
			});
		}

		// Osakohteet: 773 ## $g Raita [numero], muuta 01->1, 02->2 jne.
		// jos monta uraa 	(esim. 01-08) 		-> 773 ## $g Raidat [numero-numero], muuta 01->1, 02->2 jne.
		// jos monta levyä 	(esim. 1:02)		-> 773 ## $g Levy 1, raita 2
		// 					(esim. 1:03-1:04) 	-> 773 ## $g Levy 1, raidat 3-4
		// +Added handling of 'sides' like in previous solution
		let value = '';
		if (ends.length > 1 && discs > 1) {
			value =	(hasSides ? `${ends[0][0]}-puoli` : `Levy ${ends[0][0]}`) + `, raita ${ends[0][1]}` +
					(hasSides ? ` - ${ends[1][0]}-puoli` : ` - levy ${ends[1][0]}`) + `, raita ${ends[1][1]}`;
		} else if (ends.length > 1) {
			if (ends.length > 2) {
				Logger.log('error', '103 field: more than 2 ends detected');
			}

			if (discs > 0) {
				value = (hasSides ? `${ends[0][0]}-puoli, ` : `Levy ${ends[0][0]},`) +
						(discs > 0 ? ' raidat ' : 'Raidat ') + `${ends[0][1]}-${ends[1][1]}`;
			} else {
				value = value + (discs > 0 ? 'raidat ' : 'Raidat ') + `${ends[0][0]}-${ends[1][0]}`;
			}
		} else if (discs > 0) {
			value = (hasSides ? `${ends[0][0]}-puoli, ` : `Levy ${ends[0][0]}, `) +
						(discs > 0 ? 'raita ' : 'Raita ') + ends[0][1];
		}

		marcRecord.insertField({
			tag: '773',
			ind1: '',
			ind2: '',
			subfields: [{
				code: 'g',
				value: value
			}]
		});
	}
}

export function handle112(fonoMap, marcRecord, Logger) {
	const data112 = fonoMap.getSingle('112');
	const data120 = fonoMap.getSingle('120');
	if (data112 === false) {
		Logger.log('info', '112 field: does not exist, or multiple fields');
		return;
	}

	// Jos-ja-vain-jos Fonon 120-kenttää ei ole, niin luodaan
	// 518 ## $o Äänitys $d yyyy.
	// ToDo, check: NV: nykykoodissa tämä on poikasen ensisijainen julkaisuvuosipaikka (008/07-10 ja 264$c [yyyy]), vrt. 222
	if (!data120) {
		marcRecord.insertField({
			tag: '518',
			ind1: '',
			ind2: '',
			subfields: [{
				code: 'o',
				value: 'Äänitys:'
			},
			{
				code: 'd',
				value: data112.match(/[0-9]{4}/)[0] + '.'
			}]
		});
	}
}

// Huom. Samassa kentässä voi olla useampia tietoja.
// Äänittäjä-tieto tiputetaan pois. Muu tieto pitäisi periaatteessa saada talteen.. //Not in sample records
// Voi sisältää käytettävää tietoa esitysvuodesta (joka voi olla eri kuin 112:n vuosi), raidoista

// 518 ## $o $d $p $3
// Radiolähetys/livetieto tms. menee 518:n $o-osakenttään suluissa. (pakollinen)
// Fonon 120:sta tuleva vuosi menee 518$d:hen (optionaalinen)
// Esityspaikka menee 518$p:hen (optionaalinen)
// Raidat menevät 518$3:een (optionaalinen)
// 033-kenttä luodaan esitysajankohtien perusteella. ind1 voi olla 0, 1 tai 2 noiden määrän perusteella, ind2=0. $a-osakenttään tulee tieto ajankohdasta suomenkielellä. Paikkatietoja tänne ei ole laitettu.

// ToDo: How data is supposed to be parsed from input?
// Input: 'Helsinki: Dubrovnik: We Jazz Festival 20151211 (live).'
export function handle120(fonoMap, marcRecord, Logger) {
	const data120 = fonoMap.getAllCombined('120');
	if (data120 === false) {
		Logger.log('info', '120 field: does not exist');
		return;
	}

	if (data120.match(/; *äänisuunnittelija: [^.;:]+(;|$)/g)) {
		Logger.log('error', '120 field: Äänisuunnittelija detected. ToDO: handle this');
	}

	let places = data120.split(/\)\.\s+/).filter(n => n);

	for (let i = 0; i < places.length; i++) {
		if (i < places) {
			places[i] += ')'; // Palauta splitin 'syömä' sulku
		}
	}

	// Pisteelliset normaalin splittauksen poikkeustapaukset
	for (let i = 0; i < places.length; i++) {
		// 2017Q4:ssä nähtiin tapaus, jossa yllä oleva ').'-erotin ei toiminutkaan:
		// console.log('1. For: ', i, ' place: ', places[i]);
		// console.log('Match: ', places[i].match(/(\/\d+:\d+-\d+)\.\s+(.*)/));
		// 'Tshekki: Vizovice: Masters of Rock 20160715 (live) /2:01-19. Tshekki: Vizovice: Masters of Rock 20140711 (live) /3:01-19'
		while (places[i].match(/(\/\d+:\d+-\d+)\.\s+(.*)/)) {
			console.log('Other half splicing commented 1');
			// let latterHalf = 2;
			// console.log('120 SPLIT //1:\n \'places[i]\' vs\n \'latterHalf\'\n');
			// places.splice(places, i + 1, 0, latterHalf);
		}
	}

	// Siivouksia ennen ja-tyyppiä
	for (let i = 0; i < places.length; i++) {
		// console.log('2. For: ', i);
		// console.log('Match: ', places[i].match(/\(live\) (\/\d+:\d+-\d+)/));
		// console.log('Match: ', places[i].match(/\(live\) *\( *(\/(\d+)([,-]\d+)*|CD\d+)\)/));
		// console.log('Match: ', places[i].match(/\(live\) *\/((\d+)([,-]\d+)*|CD\d+)/));
		//  '(live) ( /01-05)' => '(live /01-05)'
		while (places[i].match(/\(live\) (\/\d+:\d+-\d+)/) || // (live $1)/
			places[i].match(/\(live\) *\( *(\/(\d+)([,-]\d+)*|CD\d+)\)/) || // (live $1)/
			places[i].match(/\(live\) *\/((\d+)([,-]\d+)*|CD\d+)/)) { // (live \/$1)/
			console.log(' REDO live brackets to: \'places[i]\'\n');
		}
	}

	// 'ja' tms. tyyppiset normaalin splittauksen poikkeustapaukset:
	for (let i = 0; i < places.length; i++) {
		// Splittaa
		// 'Helsinki: Liisankadun Studio 19741002 (radio-ohjelma, Yle 2) (live) ( /01-05) ja 19770511 (radio-ohjelma, Yle 2) (live) ( /06-10)' kahdeksi:
		// 'Helsinki: Liisankadun Studio 19741002 (radio-ohjelma, Yle 2) (live) ( /01-05)
		// 'Helsinki: Liisankadun Studio 19770511 (radio-ohjelma, Yle 2) (live) ( /06-10)'
		// console.log('3. For: ', i);
		// console.log('Match: ', places[i].match(/\d{8}(?: \(.*?\))* \(live \/[0-9,-]+\) (?:ja|\&)( \d{8}( \(.*?\))? \(live \/[0-9,-]+\))$/));

		while (places[i].match(/\d{8}(?: \(.*?\))* \(live \/[0-9,-]+\) (?:ja|&)( \d{8}( \(.*?\))? \(live \/[0-9,-]+\))$/)) { // $1/
			console.log('Other half splicing commented 2');
			// let otherHalf = '$2'; // $` . $2;
			// console.log('120 SPLIT //2:\n \'places[i]\' vs\n otherHalf\n');
			// console.log('Splice: ', places.splice(i + 1, 0, otherHalf));
		}

		// console.log('Match: ', places[i].match(/(.*? \d{8}); (\D+ \d{8}-*)/));
		// Aanitteet_2018Q4.txt:120Seinäjoki: Rytmikorjaamo 20161028; Tampere: Pakkahuone 20161029 (live
		// Aanitteet_2018Q4.txt:120/2:01-2:18).
		// (liven splitti ei onnistu näillä tiedoilla)
		if (places[i].match(/(.*? \d{8}); (\D+ \d{8}-*)/)) {
			let otherHalf = '$2';
			// console.log('120 SPLIT //3:\n \'places[i]\' vs\n otherHalf\n');
			places.splice(i + 1, 0, otherHalf);
			// console.log('Die...');
		}

		// console.log('Match: ', places[i].match(/( \d{6} \(live\) \/[0-9,-]+), (\S+ \d{6} \(live\) \/[0-9,-]+)/));
		// Splittaa Seinäjoki 198006 (live) /09-12, Nivala 198108 (live) /13-16
		while (places[i].match(/( \d{6} \(live\) \/[0-9,-]+), (\S+ \d{6} \(live\) \/[0-9,-]+)/)) { // 1/
			console.log('Other half splicing commented 3');
			// let otherHalf = 2;
			// console.log('120 SPLIT //4:\n \'places[i]\' vs\n otherHalf\n');
			// places.splice(i + 1, 0, otherHalf);
		}

		// console.log('Match: ', places[i].match(/(: [^:;]+); ([^:;]+: .*)/));
		// 'Nauvo: Nauvon kirkko; Korppoo: Korppoon kirkko; Parainen: Paraisten kirkko'
		// 2019-01-15 bugs fixed...
		if (places[i].match(/(: [^:;]+); ([^:;]+: .*)/)) { // 1/
			let otherHalf = 2;
			// console.log('120 SPLIT //5:\n \'places[i]\' vs\n otherHalf\n');
			places.splice(i + 1, 0, otherHalf);
		}
	}

	// Poista roskat:
	for (let i = places.length - 1; i >= 0; i--) {
		// console.log('Cleaning trash, ind: ' + i);
		if (places[i].match(/^Äänittäjä: *YLE/)) { // Duplicate check?
			places.splice(i, 1);
		}

		// Place =~ s/\(live\) (\/\d:\d+-\d+)/(live 1)/;
		places[i].match(/\(live\) (\/[0-9:,-]+)/, 'ToDo'); // (live 1)/
		places[i].replace(/Suomi \(Ahvenanmaa\)/, 'Suomi: Ahvenanmaa');
		places[i].replace(/\(live\s+\)/g, '(live)');
	}

	// Console.log('---------------------------------')
	// console.log('Data: ', data120)
	// console.log(data120.match(/\([\w]*\)/))

	// 120Helsinki: Dubrovnik: We Jazz Festival 20151211 (live).
	// 1202007102007 (live).
	// 120Äänitys ja miksaus: Suomi, Saksa.
	// 120Helsinki: Savoy 20151231 (live).
	// 120Tampere: Ratinan stadion 20160806 (live).
	// 120Forssan teatteritalo 19730819 (live).
	// 120Somero: Esakallio 20170421 (live).
	// 120Tuulos: Kapakanmäki 20170428 (live).
	// 120Seinäjoki: Provinssirock 19900603 (live).
	// 120Helsinki: Kulttuuritalo
	// 120Helsinki: Liisankadun Studio 19740313 (radio-ohjelma, Yle 2) (live).
	// 120Hollola: Sovituksen kirkko.
	// 120Tampere: Olympiasali 20170401 (live).
	// 120Äänitys: Suomi ja Tsekki.
	// 120Äänitys: Suomi, UK.
	// 120Äänitys: Norja 2014 /urat 02-03,05-08; Äänitys: Norja 2016? /ura 04.
	// 120Pori: Työväentalo 1957 (live).
	// 120Äänitys: Suomi ja/tai: USA.
	// 120Äänitys: Yhdysvallat (USA), Iso-Britannia (UK).
	// 120Muenchen: Herkulessaal 201501 (live).
	// 120Amsterdam: Concertgebouw 20151218&20 (live).
	// 120Utsjoki: Pub Rastigaisa 2015 (live /14).
	// 120Live /Osittain.
	// 120Helsinki: Tunnelmasta toiseen 1963 (tv-ohjelma, Yleisradio).
	// 12019771003.
	// 12019781214-15.
	// 120Tukholma 197902.
	// 120198003.
	// 120Live.

	// Jatkuu useammalle riville:
	// 120Äänitys: Suomi, Ruotsi, Slovakia, Tshekki, Yhdysvallat (USA), Saksa,
	// 120Englanti (UK).

	// let data = data120.match(/\([\w]*\)/);
	// if(data){
	// 	subfields.push({code: 'o', value: data[0]})
	// }

	// marcRecord.insertField({
	// 	tag: '518',
	// 	ind1: '',
	// 	ind2: '',
	// 	subfields: subfields
	// });
}

// Sub fono120splitter($) {
// 	my ( $fono120 ) = @_;

// 	print STDERR 'DEBUG FONO-120/PLACES: '$fono120'\n';

// 	if ( $fono120 =~ s/; *äänisuunnittelija: [^\.;:]+(;|$)/$1/ ) {
// 		print STDERR 'Äänisuunnittelija pois, nyt: '$fono120'\n';
// 	}

// 	# Normaali splittaus:

// 	my @places = split(/\)\.\s+/, $fono120);

// 	for ( my $i=0; $i <= $#places; $i++ ) {
// 	  if( $i < $#places ) { $places[$i] .= ')'; } # palauta splitin 'syömä' sulku
// 	}

// 	# Pisteelliset normaalin splittauksen poikkeustapaukset
// 	for ( my $i=0; $i <= $#places; $i++ ) {
// 		# 2017Q4:ssä nähtiin tapaus, jossa yllä oleva ').'-erotin ei toiminutkaan:

// 		# 'Tshekki: Vizovice: Masters of Rock 20160715 (live) /2:01-19. Tshekki: Vizovice: Masters of Rock 20140711 (live) /3:01-19'
// 		while ( $places[$i] =~ s/(\/\d+:\d+-\d+)\.\s+(.*)/$1/ ) {
// 		my $otherHalf = $2;
// 		print STDERR '120 SPLIT #1:\n '$places[$i]' vs\n '$otherHalf'\n';
// 		splice(@places, $i+1, 0, $otherHalf);
// 		}
// 	}

// 	# siivouksia ennen ja-tyyppiä
// 	for ( my $i=0; $i <= $#places; $i++ ) {
// 		#  '(live) ( /01-05)' => '(live /01-05)'
// 		while ( $places[$i] =~ s/\(live\) (\/\d+:\d+-\d+)$/(live $1)/ ||
// 			$places[$i] =~ s/\(live\) *\( *(\/(\d+)([,-]\d+)*|CD\d+)\)/(live $1)/ ||
// 			$places[$i] =~ s/\(live\) *\/((\d+)([,-]\d+)*|CD\d+)/(live \/$1)/ ) {
// 		print STDERR ' REDO live brackets to: '$places[$i]'\n';
// 		}
// 	}

// 	# 'ja' tms. tyyppiset normaalin splittauksen poikkeustapaukset:
// 	for ( my $i=0; $i <= $#places; $i++ ) {
// 	  # Splittaa
// 	  # 'Helsinki: Liisankadun Studio 19741002 (radio-ohjelma, Yle 2) (live) ( /01-05) ja 19770511 (radio-ohjelma, Yle 2) (live) ( /06-10)' kahdeksi:
// 	  # 'Helsinki: Liisankadun Studio 19741002 (radio-ohjelma, Yle 2) (live) ( /01-05)
// 	  # 'Helsinki: Liisankadun Studio 19770511 (radio-ohjelma, Yle 2) (live) ( /06-10)'

// 	  while ( $places[$i] =~ s/( \d{8}(?: \(.*?\))* \(live \/[0-9,-]+\)) (?:ja|\&)( \d{8}( \(.*?\))? \(live \/[0-9,-]+\))$/$1/ ) {
// 		my $otherHalf = $` . $2;
// 		print STDERR '120 SPLIT #2:\n '$places[$i]' vs\n $otherHalf\n';
// 		splice(@places, $i+1, 0, $otherHalf);
// 	  }
// 	  #Aanitteet_2018Q4.txt:120Seinäjoki: Rytmikorjaamo 20161028; Tampere: Pakkahuone 20161029 (live
// 	  #Aanitteet_2018Q4.txt:120/2:01-2:18).
// 	  # (liven splitti ei onnistu näillä tiedoilla)
// 	  if ( $places[$i] =~ s/(.*? \d{8}); (\D+ \d{8}-*)$/$1/ ) {
// 		my $otherHalf = $2;
// 		print STDERR '120 SPLIT #3:\n '$places[$i]' vs\n $otherHalf\n';
// 		splice(@places, $i+1, 0, $otherHalf);
// 		die();
// 	  }

// 	  # splittaa Seinäjoki 198006 (live) /09-12, Nivala 198108 (live) /13-16
// 	  while (  $places[$i] =~ s/( \d{6} \(live\) \/[0-9,-]+), (\S+ \d{6} \(live\) \/[0-9,-]+)$/$1/ ) {
// 		my $otherHalf = $2;
// 		print STDERR '120 SPLIT #4:\n '$places[$i]' vs\n $otherHalf\n';
// 		splice(@places, $i+1, 0, $otherHalf);
// 	  }
// 	  # 'Nauvo: Nauvon kirkko; Korppoo: Korppoon kirkko; Parainen: Paraisten kirkko'
// 	  # 2019-01-15 bugs fixed...
// 	  if ( $places[$i] =~ s/(: [^:;]+); ([^:;]+: .*)$/$1/ ) {
// 		my $otherHalf = $2;
// 		print STDERR '120 SPLIT #5:\n '$places[$i]' vs\n $otherHalf\n';
// 		splice(@places, $i+1, 0, $otherHalf);
// 	  }
// 	}

// 	# Poista roskat:
// 	for ( my $i=$#places; $i >= 0; $i-- ) {
// 	  if ( $places[$i] =~ /^Äänittäjä: *YLE$/ ) {
// 		splice(@places, $i, 1);
// 	  }
// 	  #$place =~ s/\(live\) (\/\d:\d+-\d+)$/(live $1)/;
// 	  $places[$i] =~ s/\(live\) (\/[0-9:,-]+)$/(live $1)/;
// 	  $places[$i] =~ s/Suomi \(Ahvenanmaa\)/Suomi: Ahvenanmaa/;
// 	  $places[$i] =~ s/\(live\s+\)/(live)/g;
// 	}

// 	return @places;
//   }

// -----------------------------------------

// sub fono120splitter2($$) {
// 	my ( $recMarc, $place ) = @_;
// 	my $orig_place = $place;
// 	print STDERR 'DEBUG PLACE WP1 '$place'\n';

// 	my $f033ind2 = '';

// 	# KS 9.9.2016: Miksaus jätetään pois, ei mene 518:aan:
// 	if ( $place =~ /^Miksaus:/i ) { next; }
// 	$place =~ s/^Äänitys ja miksaus: */Äänitys: /i;

// 	# Paikkojen siivoamista
// 	$place =~ s/^Äänittäjä: .*//i;
// 	$place =~ s/^Äänitys: //i;
// 	$place =~ s/Englanti *\(UK\)/Englanti/g;
// 	$place =~ s/Iso-Britannia *\(UK\)/Iso-Britannia/g;
// 	$place =~ s/Yhdysvallat *\(USA\)/Yhdysvallat/g;

// 	$place =~ s/\bUSA\b/Yhdysvallat/g;
// 	$place =~ s/\/urat? (\d)/\/$1/g;
// 	###########################
// 	## Käsittele live-tieto: ##
// 	###########################
// 	my $prefix = '';
// 	my $live = '';
// 	my $raidat = '';
// 	my $progtype = '';

// 	if ( $place =~ s/ (\(live: ([^\/\)]+)\))/ (live)/ ) {
// 	  print STDERR ' Karsitaan Fono 120:n osa: '$1' => '$2'\n';
// 	}

// 	my $carry_on = 1;
// 	while ( $carry_on ) {
// 	  $carry_on = 0;

// 	  # Muut sulut (täytyy tehdä vaikeamman kautta jos näitä on useampia...)
// 	  if ( $place =~ s/ *\((Kansansinfoniakonsertti \d+|radiolähetys|radio-ohjelma|suora radiolähetys|tv-ohjelma, Yleisradio)\)$// ) {
// 		if ( $progtype ) { die(); }
// 		$progtype = $1; # => 518$o Other event information
// 		$carry_on = 1;
// 	  }
// 	  elsif ( $place =~ s/ *\(radiolähetys \/live\)$// ) {
// 		if ( $progtype ) { die(); }
// 		if ( $prefix ) { die(); }
// 		$progtype = 'radiolähetys';
// 		$prefix = 'Livetaltiointi';
// 		$carry_on = 1;
// 	  }
// 	  # 'Helsinki: Sibelius-viikko 19560612 (radiolähetys 19561009) (live)'
// 	  # Tässä hukataan lähetyksen ajankohta, mutta esitysajankohta/nauhoitusaika
// 	  # jäänee talteen...
// 	  elsif ( $place =~ s/([0-9]{8}(.*\S)*) *\(radiolähetys [0-9]{8}\)$/$1/ ) {
// 		if ( $progtype ) { die(); }
// 		$progtype = 'radiolähetys';
// 		$carry_on = 1;
// 	  }
// 	  elsif ( $place =~ s/ *\((radio-ohjelma(?:[^\/\)]*))\)$// ) {
// 		if ( $progtype ) { die(); }
// 		$progtype = $1;
// 	  }
// 	  elsif ( $place =~ s/ *\((live|osittain live) ?\/([0-9:-,]+|[AB[0-9]+|CD\d+)\)$//i ) {
// 		if ( $live || $raidat ) { die(); }
// 		$live = '('.$1.')';
// 		$raidat = $2;
// 		$carry_on = 1;
// 	  }
// 	  elsif ( $place =~ s/ \(live ($yyyy_regexp$mm_regexp)\)$/ $1/) {
// 		if ( $live ) { die(); }
// 		$live = '(live)';
// 	  }
// 	  elsif ( $place =~ s/ *\((live|osittain live) \/(mahdollisesti)\)$//i ) {
// 		if ( $live ) { die(); }
// 		$live = '('.$1.')';
// 		$carry_on = 1;
// 	  }
// 	  elsif ( $place =~ s/ *\((live|osittain live) \/(soundcheck)\)$//i ) {
// 		if ( $live || $progtype ) { die(); }
// 		$live = '('.$1.')';
// 		$progtype = $2;
// 		$carry_on = 1;
// 	  }
// 	  elsif ( $place =~ s/ *\((live|osittain live|live \/osittain)\)$//i ) {
// 		my $tmp = $1;
// 		if ( $tmp eq 'live /osittain' ) { $tmp = 'osittain live'; }
// 		$live = '('.$tmp.')';
// 		$carry_on = 1;
// 	  }
// 	  # 'Sveitsi: Geneve: Festival Jazz Contre Band 2016: AMR (Association pour l'encouragement de la musique improvisee) 20161017-18'
// 	  elsif ( 0 && $place =~ /^[^\(]*[A-Z] \([^\)0-9]+\) \d+(-\d+)?$/ ) {
// 		# ignoroi aukikirjoitettu lyhenne
// 	  }
// 	  #elsif ( $place =~ s/ (\([A-Za-z ]+ \/[1-9]\. palkinto\))$// ) {
// 	  elsif ( $place =~ s/( \([A-Za-z ]+ [0-9]{4} \/[1-9]\. palkinto\))$// ) {
// 		print STDERR 'NB! ignoroitiin '$1'\n';
// 		$carry_on = 1;
// 	  }
// 	}

// 	$place =~ s/ \(($yyyy_regexp$mm_regexp$dd_regexp)\)$/ $1/g;

// 	if ( $place =~ /\(/ && $place !~ /[0-9]{4}$/ ) {
// 	  if ( $place !~ /^[^\(]*\(Ayers rock\)[^\)]*$/ ) {
// 		print STDERR 'TODO: Selvitä sulku: '$place'/'', $orig_place, ''\n';
// 		die();
// 	  }
// 	}

// 	if ( !$prefix ) { $prefix = 'Äänitys'; }

// 	# KS 9.9.2016: Äänitys + (live) => Livetaltiointi
// 	if ( $prefix eq 'Äänitys' && $live ne '' ) {
// 	  if ( $live eq '(live)' ) {
// 		$prefix = 'Livetaltiointi';
// 		$live = '';
// 	  }
// 	  elsif ( $live eq '(live /soundcheck)' ) {
// 		$prefix = 'Livetaltiointi (soundcheck)';
// 		$live = '';
// 	  }
// 	  elsif ( $live eq '(osittain live)' ) {
// 		# OK. Älä muuta mitään.
// 	  }
// 	  else {
// 		print STDERR 'LIVE TODO $prefix/$live';
// 		die();
// 	  }
// 	}

// 	print STDERR 'DEBUG PLACE WP2 '$place'\n';

// 	# I: 'Suomi, Englanti (UK) /orkesteri-osuus; kuoro-osuus'
// 	# => 'Suomi, Englanti (UK)'
// 	if ( $place =~ /\/ura/ ) { die($place); }
// 	if ( $place =~ s/ \/(.*)$// ) {
// 	  print STDERR 'DEBUG 120: kommentti pois: $1\n';

// 	}
// 	if ( $place =~ /(;|nisuunnittelija)/ ) {
// 	  die('120 needs rethinking: $place\n');
// 	}

// 	# Yritetään poimia vuosilukuja Fonon 120-kentästä
// 	my $year120 = '';

// 	$place =~ s/ ja: / ja /;
// 	$place =~ s/ ja\/tai: / ja\/tai /g; # Fono2018Q2

// 	# Multiple single dates (IND2=1)
// 	# ' ja: ' oli 2016Q2-datassa.

// 	if ( $place =~ s/(?:^| )(\d{4})(0[1-9]|1[012])(0[1-9]|[12][0-9]|3[01])(, | ja +| tai | *\& *)(\d{4})(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])( \([^\)]+\))?$/$8/ ) {
// 	  my $y1 = $1;
// 	  my $m1 = $2;
// 	  my $d1 = $3;
// 	  my $sep = $4;
// 	  my $y2 = $5;
// 	  my $m2 = $6;
// 	  my $d2 = $7;

// 	  my $a1 = '$y1$m1$d1';
// 	  my $a2 = '$y2$m2$d2';

// 	  $year120 = '$d1.$m1.$y1$sep$d2.$m2.$y2';
// 	  $year120 =~ s/(^|\.)0(\d)/$1$2/g; # Nollat pois päivämäärän alusta

// 	  print STDERR '033 1 : \$a $a1 \$a $a2\n';
// 	  $recMarc->insert_fields_ordered(MARC::Field->new('033', '1', '0', a => $a1, a => $a2));
// 	}
// 	# 20170919,23,30
// 	elsif ( $place =~ s/(?:^| )($yyyy_regexp)($mm_regexp)($dd_regexp),($dd_regexp),($dd_regexp)$// ) {
// 	  my $yyyy = $1;
// 	  my $mm = $2;
// 	  my $d1 = $3;
// 	  my $d2 = $4;
// 	  my $d3 = $5;

// 	  my $a1 = '$yyyy$mm$d1';
// 	  my $a2 = '$yyyy$mm$d2';
// 	  my $a3 = '$yyyy$mm$d3';

// 	  $year120 = '$d1.$mm.$yyyy, $d2.$mm.$yyyy, $d3.$mm.$yyyy'; # aika tuskainen
// 	  $year120 =~ s/(^|\.)0(\d)/$1$2/g; # Nollat pois päivämäärän alusta

// 	  print STDERR '033 1 : \$a $a1 \$a $a2 \$ $a3\n';
// 	  $recMarc->insert_fields_ordered(MARC::Field->new('033', '1', '0', a => $a1, a => $a2, a => $a3));
// 	}
// 	# 2016Q3: 'Amsterdam: Concertgebouw: 2013&2015'
// 	elsif ( $place =~ s/(?:^| )([12]\d{3})(\&)([12]\d{3})$// ) { # YYYY&YYYY
// 	  $year120 = '$1$2$3';
// 	  my $a1 = '$1----';
// 	  my $a2 = '$3----';
// 	  print STDERR '033 1 : \$a $a1 \$a $a2\n';
// 	  $recMarc->insert_fields_ordered(MARC::Field->new('033', '1', '0', a => $a1, a => $a2));
// 	}
// 	elsif ( $place =~ s/(?:^| )((?:19[0-9][0-9]|20[0-2][0-9])(?:0[1-9]|1[012]))(\&)([12]\d{3}(?:0[1-9]|1[012]))$// ) { # YYYYMM&YYYYMM
// 	  $year120 = '$1$2$3';
// 	  my $a1 = '$1--';
// 	  my $a2 = '$3--';
// 	  print STDERR '033 1 : \$a $a1 \$a $a2\n';
// 	  $recMarc->insert_fields_ordered(MARC::Field->new('033', '1', '0', a => $a1, a => $a2));
// 	}
// 	elsif ( $place =~ s/(?:^| )([12]\d{3})(0[1-9]|1[012])( *\& *| *- *)([12]\d{3})(0[1-9]|1[012])$// ) { # YYYYMM&YYYYMM, YYYYMM-YYYYMM
// 	  my $a1 = '$1$2--';
// 	  my $a2 = '$4$5--';

// 	  my $y1 = $1;
// 	  my $m1 = $2;
// 	  my $separator = $3;
// 	  my $y2 = $4;
// 	  my $m2 = $5;

// 	  my $ind2 = separator2indicator2($separator);
// 	  my $m1name = int2finnish_month_name($m1);
// 	  my $m2name = int2finnish_month_name($m2);

// 	  $year120 = '$m1name $y1 $separator $m2name $y2';

// 	  print STDERR '033 1 : \$a $a1 \$a $a2\n';
// 	  $recMarc->insert_fields_ordered(MARC::Field->new('033', $ind2, '0', a => $a1, a => $a2));
// 	}
// 	elsif ( $place =~ s/(?:^| )(0[1-9]|1[012])([12]\d{3})( *\& *| *- *)(0[1-9]|1[012])([12]\d{3})$// ) { # MMYYYY&MMYYYY, MMYYYY-MMYYYY
// 	  my $m1 = $1;
// 	  my $y1 = $2;
// 	  my $separator = $3;
// 	  my $m2 = $4;
// 	  my $y2 = $5;

// 	  my $a1 = '$y1$m1--';
// 	  my $a2 = '$y2$m2--';

// 	  my $ind2 = separator2indicator2($separator);

// 	  my $m1name = int2finnish_month_name($m1);
// 	  my $m2name = int2finnish_month_name($m2);

// 	  $year120 = '$m1name $y1 $separator $m2name $y2';

// 	  print STDERR '033 1 : \$a $a1 \$a $a2\n';
// 	  $recMarc->insert_fields_ordered(MARC::Field->new('033', $ind2, '0', a => $a1, a => $a2));
// 	}

// 	elsif ( $place =~ s/(?:^| )(\d{4})(0[1-9]|1[012])(0[1-9]|[12][0-9]|3[01])( ja | tai | *\& *)(0[1-9]|[12][0-9]|3[01])$// ) {
// 	  $year120 = '$3.$2.$1$4$5.$2.$1';
// 	  my $a1 = '$1$2$3';
// 	  my $a2 = '$1$2$5';
// 	  print STDERR '033 1 : \$a $a1 \$a $a2\n';
// 	  $recMarc->insert_fields_ordered(MARC::Field->new('033', '1', '0', a => $a1, a => $a2));
// 	}
// 	# Range of dates (IND2=2)
// 	elsif ( $place =~ s/ (\d{4})(0[1-9]|1[012])(0[1-9]|[12][0-9]|3[01])-(\d{4})(0[1-9]|1[012])(0[1-9]|[12][0-9]|3[01])$// ) {
// 	  $year120 = '$3.$2.$1-$6.$5.$4';
// 	  my $a1 = '$1$2$3';
// 	  my $a2 = '$4$5$6';
// 	  print STDERR '033 2 : \$a $a1 \$a $a2\n';
// 	  $recMarc->insert_fields_ordered(MARC::Field->new('033', '2', '0', a => $a1, a => $a2));
// 	}
// 	# YYYYMMDD-MMDD
// 	elsif ( $place =~ s/(?:^| )([12]\d{3})(0[1-9]|1[012])(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[012])(0[1-9]|[12][0-9]|3[01])$// ) {
// 	  $year120 = '$3.$2.-$5.$4.$1';
// 	  my $a1 = '$1$2$3';
// 	  my $a2 = '$1$4$5';
// 	  print STDERR '033 2 : \$a $a1 \$a $a2\n';
// 	  $recMarc->insert_fields_ordered(MARC::Field->new('033', '2', '0', a => $a1, a => $a2));
// 	}
// 	# YYYYMMDD-DD
// 	elsif ( $place =~ s/(?:^| )([12]\d{3})(0[1-9]|1[012])(0[1-9]|[12][0-9]|3[01])-(0[1-9]|[12][0-9]|3[01])$// ) {
// 	  $year120 = '$3.-$4.$2.$1';
// 	  my $a1 = '$1$2$3';
// 	  my $a2 = '$1$2$4';
// 	  print STDERR '033 2 : \$a $a1 \$a $a2\n';
// 	  $recMarc->insert_fields_ordered(MARC::Field->new('033', '2', '0', a => $a1, a => $a2));
// 	}
// 	# YYYYMM-MM
// 	elsif ( $place =~ s/(?:^| )(19[0-9][0-9]|20[0-9][0-9])(0[1-9]|1[012])-(0[1-9]|1[012])$// ) {
// 	  my $y = $1;
// 	  my $m1 = $2;
// 	  my $m2 = $3;
// 	  my $m1name = int2finnish_month_name($m1);
// 	  my $m2name = int2finnish_month_name($m2);
// 	  $year120 = '$m1name $y - $m2name $y';
// 	  my $a1 = '$y${m1}--'; # '-' means unknown
// 	  my $a2 = '$y${m2}--';
// 	  print STDERR 'Y120\t$year120\n';
// 	  print STDERR '033\t2 : \$a $a1 \$a $a2\n';
// 	  $recMarc->insert_fields_ordered(MARC::Field->new('033', '2', '0', a => $a1, a => $a2));
// 	}

// 	## Single date
// 	elsif ( $place =~ s/(?:^| )(19[0-9][0-9]|20\d{2})(0[1-9]|1[012])(0[1-9]|[12][0-9]|3[01])$// ) { # YYYYMMDD
// 	  $year120 = '$3.$2.$1';
// 	  my $f033a = '$1$2$3';
// 	  print STDERR '033 0 : \$a $f033a\n';
// 	  $recMarc->insert_fields_ordered(MARC::Field->new('033', '0', '0', a => $f033a));
// 	}
// 	elsif ( $place =~ s/(?:^| )(19[0-9][0-9]|20[01][0-9])(0[1-9]|1[012])$// ) {
// 	  # YYYYMM (oletus-6-numeroinen)
// 	  # Onkohan tällä mennyt joku MMYYYY läpi...
// 	  # Regexpiä tiukennettu 20181015.
// 	  my $y = $1;
// 	  my $m = $2;
// 	  my $f033a = '$y${m}--';

// 	  # $year120 = '$3.$2.$1';

// 	  my $mname = int2finnish_month_name($m);
// 	  $year120 = '$mname $y';
// 	  print STDERR '033 0 : \$a $f033a\n';
// 	  $recMarc->insert_fields_ordered(MARC::Field->new('033', '0', '0', a => $f033a));
// 	}
// 	elsif ( $place =~ s/(?:^| )(0[1-9]|1[012])(20[01][0-9])$// ) { # MMYYYY
// 	  # Nähty 2018Q3:ssa ekan kerran. YYYYMM on normaali.
// 	  my $y = $2;
// 	  my $m = $1;
// 	  my $f033a = '$y${m}--';
// 	  my $mname = int2finnish_month_name($m);
// 	  $year120 = '$mname $y';
// 	  print STDERR '033 0 : \$a $f033a\n';
// 	  $recMarc->insert_fields_ordered(MARC::Field->new('033', '0', '0', a => $f033a));
// 	}
// 	elsif ( $place =~ s/(?:^| )([12]\d{3})$// ) { # YYYY
// 	  $year120 = '$1';
// 	  my $f033a = '$1----';
// 	  print STDERR '033 0 : \$a $f033a\n';
// 	  $recMarc->insert_fields_ordered(MARC::Field->new('033', '0', '0', a => $f033a));
// 	}
// 	elsif ( $place =~ s/ (\d{4})$// || $place =~ s/ (\d{4}-\d{4})$// ) {
// 	  $year120 = $1;
// 	}
// 	elsif ( $yq eq '2017Q3' && $place =~ s/^(2007102007)$// ) { # ugly hack
// 	  $year120 = '13.10.2007';
// 	  my $f033a = '20071013';
// 	  print STDERR '033 0 : \$a $f033a\n';
// 	  $recMarc->insert_fields_ordered(MARC::Field->new('033', '0', '0', a => $f033a));
// 	}

// 	elsif ( $place =~ s/(^| )(20\d\d\?)$// ) {
// 		print STDERR ' NB! Skip Fono 120 data '$2'\n';
// 	}
// 	elsif ( $place =~ /\d{4}/ ) {
// 	  # we wanto to debug this further...
// 	  print STDERR 'TODO PLACE '$place'\n';
// 	  die('PLACE: '$place'');
// 	}
// 	elsif ( $place =~ /[\/\(\)]/ ) {
// 	  # debug further...
// 	  if ( $place =~ /^[^\/]+( ja\/tai [^\/]+)+$/ ) {
// 		# do nothing
// 	  }
// 	  else {
// 		print STDERR 'TODO PLACE '$place'\n';
// 		die('PLACE: '$place'');
// 	  }
// 	}
// 	if ( $place =~ / (ja|tai):?$/ ) {
// 	  die('$place/$year120');
// 	}
// 	$place =~ s/^([^:]+): ([^:]+|S:t [^:]+): ([^:]+)$/$1, $2, $3/i;
// 	$place =~ s/^([^:]+): ([^:]+|S:t [^:]+)$/$1, $2/i;
// 	$place =~ s/ *: *$//;

// 	if ( $raidat ) {
// 	  my $etuliite =  ( $raidat =~ /^\d+$/ ? 'Raita' : 'Raidat' );
// 	  $raidat = '$etuliite $raidat';
// 	}

// 	return ( $recMarc, $prefix, $place, $live, $year120, $progtype, $raidat );
//   }

export function handle130(fonoMap, marcRecord, Logger) {
	const data130 = fonoMap.getAll('130');
	let tag = {
		tag: '245',
		ind1: '',
		ind2: '',
		subfields: []
	};
	if (data130 === false || data130.length === 0) {
		Logger.log('info', '130 field: does not exist');
		return;
	}

	data130.forEach((line, ind) => {
		// Jos rivien sisältö on (kokoelma), (kokonaisjulkaisu), (hittikokoelma) -> ei konvertoida
		if (line === '(kokoelma)' || line === '(kokonaisjulkaisu)' || line === '(hittikokoelma)') {
			return;
		}

		// Jos tekstiä ”Omistus”, ”Tässä” -> 500 ## $a sellaisenaan
		if (line.match(/(omistus)|(tässä)/i)) {
			marcRecord.insertField({
				tag: '500',
				ind1: '',
				ind2: '',
				subfields: [{
					code: 'a',
					value: line
				}]
			});
			return;
		}

		// Jos tekstiä ”A-puoli”, ”B-puoli” -> 505 0# $a sellaisenaan
		if (line.match(/(a-puoli)|(b-puoli)/i)) {
			marcRecord.insertField({
				tag: '505',
				ind1: '0',
				ind2: '',
				subfields: [{
					code: 'a',
					value: line
				}]
			});
			return;
		}

		if (ind === 0) {
			if (line.length > 1) {
				line = line.substr(0, 1) + line.substr(1).toLowerCase();
			}

			// Toinen ja seuraavat rivit 245 osakenttään $b. Jos $b on elemassa, niin 245$a:n loppuun ':'. muuten '.'.
			if (data130.length > 1) {
				line += ':';
			} else {
				line += '.';
			}

			if (fonoMap.main()) {
				// Emo: eka rivi 245 00 $a pienaakkosilla – ks. Artikkeleiden ohitus
				tag.subfields.push({code: 'a', value: line});
			} else {
				// Osakohteet: 773 $t – vain eka rivi pienaakkosilla
				tag.tag = '773';
				tag.subfields.push({code: 't', value: line}); // ToDo: in expected 'Queen of hell. - '
			}
		} else {
			// Toinen ja seuraavat rivit 245 osakenttään $b, osakenttää $b edeltää tyhjämerkki, kaksoispiste, tyhjämerkki ( : )
			tag.subfields.push({code: 'b', value: ' : ' + line});
		}

		marcRecord.insertField(tag);
	});
}

// ToDO: Viola implementation
// NVOLK: Huom. Fono ei kerro, onko kysessä ihminen vai yhteisötekijä (eli suomeksi tässä kontekstissa käytännössä aina yhtye). Kenttien 190 ja 191 voidaan valistuneesti arvata osa tekijöistä yhteisötekijöiksi eli meneviksi kenttään X10. Lisäksi jos nimi löytyy Violan tekijäauktoriteettitietueista, niin silloin käytetään sen mukaista tulkintaa. Muuten valistunut arvaus. (Esim. 'the' tai yksisananinen tekijä indikoi yleensä yhtyettä,)
// NVOLK: Fonon nimiä (ja elinvuosia) verrataan Violan tekijäauktoriteettitietuiden nimiin ja salanimiin/taiteilijanimiin. Tarvittaessa Fonosta tuleva nimi vaihdetaan Violaan auktoriteettitietueen 1X0-kentän nimeen. (Esim. jos Fonon nimi löytyy vain auktoriteettitietueen 400-kentässä, niin saatetaankin käyttää auktoriteettitietueen 100-kentässä olevaa nimeä luotavassa tietueessa.)
export function handle140(fonoMap, marcRecord, Logger) {
	const data001 = fonoMap.getSingle('001'); // Used to search L1
	const data170 = fonoMap.getSingle('170'); // Used to search L1
	const data140 = fonoMap.getAllCombined('140');

	if (data140 === false) {
		Logger.log('info', '140 field: does not exist');
		return;
	}

	// // OLD: Henkilönnimistä pois syntymä- ja kuolinvuodet, esim. Mancini, Henry [1924-1994] (säv) -> 700 1# $a Mancini, Henry, $e säveltäjä.
	// let data = data140.replace(/(\[[\d-\s]*\])/g, '');
	// // OLD:  Nimen jälkeinen /pseud/ pois
	// data = data.replace(/(\/pseud\s\/)/g, '');

	let persons = data140.split(/\./).filter(n => n); // Split each person to array
	// let sorted700Fields = [];
	let compSet = false;

	// eslint-disable-next-line complexity
	persons.forEach(person => {
		// Tekijät luokitellaan joko ihmisiksi tai yhteisötekijöiksi. Apuna arvauksissa voi käyttää Fonon 190-
		// ja 191-kenttiä ja Violan auktoriteettitietoja. Samalla saadaan kasaan tietoa pseudonyymeistä ja
		// elinvuosista. Nykyinenen implementaatio on liian pitkä kuvattavaksi tässä, eikä tietoa välttämättä
		// muutenkaan käytetä tässä. Katsottava koodista.
		person = person.trim();
		// console.log('Person: ', person)

		// Osa tekijät-merkinnöistä ignoroidaan: /kokoelma/, /^julkaisija/i.
		if (person.match(/kokoelma/) || person.match(/^julkaisija/i)) {
			console.log('Match, ignore');
			return;
		}

		// Split by parenthesis, but not with pseudonym explanation
		let elements = person.split(/(\([^=].*\))/).filter(n => n);
		// console.log('Elements: ', elements);

		if (elements.length > 2) {
			Logger.log('error', `140 field: ppl has more than two components: ${elements}`);
			return;
		}

		if (elements.length === 0) {
			Logger.log('error', `140 field: ppl has no valid components: ${elements}`);
			return;
		}

		// Anonyymi-, Kansansävelmä-, Kansanperinne-, Kansanruno-, Kansanlaulu-, Kanteletar-,
		// Koraalitoisinto-, Negro spiritual-, Raamattu- ja Virsikirja-alkuiset 'tekijät':
		if (elements[0].match(/^anonyymi|^kansansävelmä|^kansanperinne|^kansanruno|^kansanlaulu|^kanteletar|^koraalitoisinto|^negro spiritual|^raamattu|^virsikirja/i)) {
			// - Jos tekijäfunktio on soitinnus:
			// 500 ## $a Musiikin esityskokoonpano: nimi.
			if (elements.length > 1 && elements[1].match(/soitinnus/i)) {
				marcRecord.insertField({
					tag: '500',
					ind1: '',
					ind2: '',
					subfields: [{
						code: 'a',
						value: 'Musiikin esityskokoonpano: ' + elements[0] + '.'
					}]
				});

			// - Muuten, jos nimi alkaa Kansan:
			// 381 ## $a nimi.
			} else if (elements[0].match(/^kansan/i)) {
				marcRecord.insertField({
					tag: '381',
					ind1: '',
					ind2: '',
					subfields: [{
						code: 'a',
						value: elements[0] + '.'
					}]
				});
			// -(Jos kenttä sisältää huomautuksen '/mahdollisesti', niin
			// 381 ## $a mahdollisesti nimi.
			} else if (person.match(/^mahdollisesti/i)) {
				marcRecord.insertField({
					tag: '381',
					ind1: '',
					ind2: '',
					subfields: [{
						code: 'a',
						value: 'mahdollisesti ' + elements[0] + '.'
					}]
				});

			// -Muuten jos nimi pm Raamattu tai Kanteletar
			// 500 ## $a Sanat: nimi.
			} else if (elements[0].match(/^raamattu|^kanteletar/i)) {
				marcRecord.insertField({
					tag: '500',
					ind1: '',
					ind2: '',
					subfields: [{
						code: 'a',
						value: 'Sanat: ' + elements[0] + '.'
					}]
				});

			// -Muuten
			// 500 ## $a nimi.
			} else {
				marcRecord.insertField({
					tag: '500',
					ind1: '',
					ind2: '',
					subfields: [{
						code: 'a',
						value: elements[0] + '.'
					}]
				});
			}
		}

		// Osakohteet ja taidemusiikki
		if (!fonoMap.main() || (data001 && data001.match(/L1/g)) || (data170 && data170.match(/L1/g))) {
			// Täältä yritetään löytää säveltäjä 1X0-kenttään. Eli muut jäljellä olevat tekijät:
			// otetaan eka tekijä, jonka tekijäfunktio on Fonossa "säv".
			if (!compSet && elements.length > 1 && elements[1].match(/säv/)) {
				// Eli tässä ekassa tapauksessa tekijähuomautukseen tulee poikkeuksellisesti mukaan tuo säveltäjä-tieto. (Muualla pelkät nimet riittävät.)

				// Setvitään Violan auktoriteettitietokannan avulla kentän tyyppi (100 ihmiselle, 110 yhteisölle) indikaattori 1 (alla arvo Y) (sama kuin Violassa), mahdollinen salanimi ja mahdolliset elinvuodet.
				let tag = '100';
				// ToDO: Viola: above

				// 1X0 Y# $a nimi, $c mahdollinen salanimi, $d YYYY-YYYY. tai YYYY- $e säveltäjä.
				let subfields = [{
					code: 'a',
					value: elements[0]
				}, {
					code: 'e',
					value: 'säveltäjä.'
				}];

				// ToDo: Viola: insert salanimi, vuodet

				marcRecord.insertField({
					tag: tag,
					ind1: '',
					ind2: '',
					subfields: subfields
				});

				// Jos Fonon kentässä on "ja/tai:" tai "tai:", niin otetaan ekana tullut tekijä 1X0-kenttään, ja
				// 500-kenttään tehdään merkintä, jossa myös vaihtoehtoinen/rinnakkainen tekijä on mukana tyyliin:
				// 500 ## $a Tekijähuomautus: eka nimi ja/tai: toka nimi.
				let combination = null;
				if (person.match(/\sja\/tai\s/)) {
					combination = 'ja/tai';
				} else if (person.match(/\stai\s/)) {
					combination = 'tai';
				}

				if (combination !== null) {
					console.log('*** Combination: ', person);
					marcRecord.insertField({
						tag: '500',
						ind1: '',
						ind2: '',
						subfields: [{
							code: 'a',
							value: 'Tekijähuomautus: ' + elements[0] + combination + elements[1]
						}]
					});
				}

				// ToDo:
				// Mahdollisesti poimittu tekijähuomautus
				// 500 ## Tekijähuomautus: eka nimi ja/tai: toka nimi.

				// Poistetaan eka tekijä listasta. Loppujen 7X0-kenttään menevien tekijöiden käsittely
				// kuvattu kenttien 190- ja 191-yhteydessä.
			}
		}
	});
}

export function handle141(fonoMap, marcRecord, Logger) {
	const data141 = fonoMap.getAllCombined('141');
	if (data141 === false) {
		Logger.log('info', 'Invalid 141 field: does not exist');
		return;
	}

	// 500 ## $a etutekstillä: Tekijähuomautus:
	marcRecord.insertField({
		tag: '500',
		ind1: '',
		ind2: '',
		subfields: [{
			code: 'a',
			value: 'Tekijähuomautus: ' + data141
		}]
	});
}

// Input: 'Iron Magazine (yhtye).'

// Äänitteet
// 190Maksetut viulut (yhtye).
// 190Kalatie, Heli (piano).  Lampi, Venla (piano).  Ym.
// 190Black Magic Six (yhtye).
// 190Saartamo, Venla (laulu, yhtye).

// 190Suomen Rauhanyhdistysten Keskusyhdistyksen (SRK:n) kuoro (kuoro).
// 190Heikkilä, Olli (kuoronjohtaja).  Kallunki, Lauri-Kalle (urut).
// 190Soranta, Juha (cembalo).

// 190Tuomari Nurmio (laulu, kitara, yhtye).
// 190(Dumari ja Spuget).

// 190Sydänmäki, Jussi (laulu).  Louhivuori, Janne (kitara, ym).
// 190(Jussi Sydänmäki ja Janne Louhivuori /yhteinen yhtye).

// 190Pennanen, Keijo (kitara).  Korpela, Jukka (bassokitara).  Dominis,
// 190Rob (piano ja/tai: kosketinsoittimet).  Karvonen, Jari-Pekka 'Jartsa'
// 190(rummut ja/tai: lyömäsoittimet).

// Teos
// 190Jarnos, The (yhtye).
// 190Roponen, Jussi (laulu, yhtye).
// 190Syrjänen, Saxman (saksofoni).  Gustavson, Jukka (sähköurut,
// 190HeviSaurus (yhtye).
// 190Alanko, Ismo (laulu, piano).

// 190Syrjänen, Saxman (saksofoni).  Gustavson, Jukka (sähköurut,
// 190kosketinsoittimet).
// 190(Saxman Syrjänen ja Jukka Gustavson Mojomen /yhteinen yhtye).

// Input: 'syntetisaattori).'
// Äänitteet
// 191Ym.
// 191Yhtyeen muut jäsenet lueteltu oheislehtisessä.
// 191Sekä: Puljula, Sara (kontrabasso).  Kettunen, Jari 'Kepa' (rummut).

// 191Muut jäsenet: Rauhala, Ville (kontrabasso).  Heikinheimo, Ilmari
// 191(rummut ja/tai: lyömäsoittimet).

// 191Godzinsky, George de (johtaja /01-11,15-18).  Radion viihdeorkesteri
// 191(Helsinki) (orkesteri /01-11,15-18).  Salo, Jaakko (johtaja /12-14).
// 191Studio-orkesteri (orkesteri /12-14).  Radiokuoro (kuoro /06).
// 191Kinnunen, Laila (laulu /07).  Mustonen, Ritva (laulu /07).
// 191Koskimies, Pentti (piano /19-21).  Englund, Ingmar (kitara /19-21).
// 191Helistö, Paavo (klarinetti /19-21).  Helenius, Mikko (piano,
// 191harmonikka: bandoneon, vihellys /22).

// Teos
// 191Yhtyeen jäsenet lueteltu esittelylehtisessä.
// 191Orkesterin jäsenet lueteltu tekstilehtisessä.
// 191Yhtyeen jäsenet ja avustajat lueteltu oheistiedoissa.
// 191Yhtyeen jäsenet lueteltu yleistietodokumentissa ja oheistiedoissa.

// *********************
// tark. taidemusiikin moniriviset nimekkeet! esim.:
// Näin:
// ensimmäinen 150-rivi 245 $a, muut kaksoispisteen jälkeen kenttään 245 $b.
// 1501, 1502 jne. kenttään
// 505 0# $a Osat: 15001-rivin teksti ; 15002-rivin teksti ; 15003-rivin teksti ; 15004-rivin teksti.
// *********************

// ToDo: inconsistency with 505 and 245
export function handle150(fonoMap, marcRecord, Logger) {
	let data150 = fonoMap.getAllCombined('150');
	let data151 = fonoMap.getAllCombined('151');
	let data = combineAll(data1, data2); //Array of records

	function combineAll(data1, data2) {
		let data = data1 + data2;
		
		console.log("data: ", data);

		data = data.split(/\.\s\s/);

		console.log("data: ", data);

		// data.forEach(line => {
		// 	if (data.length === 0 || line.match(/^\s/) || data.match(/\s$/)) {
		// 		data += line;
		// 	} else {
		// 		data = data + ' ' + line;
		// 	}
		// });
	}
	// if (data150 === false) {
	// 	Logger.log('info', 'Invalid 150 field: does not exist');
	// 	return;
	// }

	// let data = data150.replace(/\.\s{2}/g, ' ; ');
	// data = data.replace(/\.$/, '');

	console.log('******** 150 handling ********');
	console.log(marcRecord.fields);
	console.log('------------------');
	console.log(marcRecord.getFields('245'));
	console.log('------------------');
	console.log('Data150: ', data150);
	console.log('------------------');
	console.log('Data151: ', data151);
	console.log('------------------');

	//let data = data150[0].split(/.\s\s/).filter(n => n); //ToDo: split teos, rivi, comments below
	//console.log('Data: ', data);
	console.log('************************');

	// Emot
	if (fonoMap.main()) {
		// Jos Fonon 130-kentästä ei saatu Marcin 245-kenttää:
		// ensimmäinen 150- ja 151-kenttien 1. rivi -> 245 10 $a – ks. Artikkeleiden ohitus
		if (marcRecord.getFields('245').length === 0) {
			console.log("Does not contain 245")
			if (data150.length >= 0) {
				marcRecord.insertField({
					tag: '245',
					ind1: '1',
					ind2: '0',
					subfields: [{
						code: 'a',
						value: data150[0]
					}]
				});
			}

			if (data151.length >= 0) {
				marcRecord.insertField({
					tag: '245',
					ind1: '1',
					ind2: '0',
					subfields: [{
						code: 'a',
						value: data151[0]
					}]
				});
			}
		}

		// ToDo: Documentations "1. Rivi", old transformations copy first "line" (to first '.')
		// to field 245, but then also to 505. How "rivi" is supposed to be interpret,
		// term "teos" used documenting split.

		// Jäljelle jääneet rivit (lähinnä 151:stä):

		// 505 0# $a Xxxx ; Xxxx ; Xxxx ; Xxxx.

		//  Fonossa piste ja kaksi tyhjämerkkiä erottaa eri teokset -> korvataan Violassa tyhjämerkki puolipiste tyhjämerkki –yhdistelmällä
		let input = '';

		if (data150.length >= 2) {
			input = combineRest(input, data150);
		}

		if (data151.length >= 2) {
			input = combineRest(input, data151);
		}
		console.log("Input: ", input)

		if (input) {
			console.log('*************************');
			console.log('Input: ', input);
			console.log('*************************');

			marcRecord.insertField({
				tag: '505',
				ind1: '0',
				ind2: '',
				subfields: [{
					code: 'a',
					value: input
				}]
			});
		}

	} else {
		// Osakohteet ja 150:n arvo sisältää lauluja
		// _Tämä on oikeastaan niin monimutkainen, ettei sitä voi kunnolla speksata, vaan pitää reverse engineerata..._
		console.log('*************************');
		console.log('Complex, todo');
		console.log('*************************');

		// Hakuaputiedot

		// 500 ## $a Hakuapu: sisältö.

		// Tämä on oikeastaan niin monimutkainen, ettei sitä voi kunnolla speksata...

		// Medleyden palastelu...

		// muut rivit: jos sulkeet ja lopussa viiva (-) -> 031 ## $t, sulkeet ja loppuviiva pois

		// jos sulkeet ja yhtäläisyysmerkki (=) -> = 245 $b, sulkeet ja = pois
		// jos sulkeet ilman = ja - -> 500 ## $a, sulkeet pois, iso alkukirjain
		// tark. taidemusiikin moniriviset nimekkeet! esim.:

		// Näin:

		// ensimmäinen 150-rivi 245 $a, muut kaksoispisteen jälkeen kenttään 245 $b.

		// 1501, 1502 jne. kenttään

		// 505 0# $a Osat: 15001-rivin teksti ; 15002-rivin teksti ; 15003-rivin teksti ; 15004-

		// rivin teksti.
	}
}
/*
	marcRecord.insertField({
		tag: '505',
		ind1: '0',
		ind2: '',
		subfields: [{
			code: 'a',
			value: data
		}]
	});
*/

// Aanitteet / Emot
// 151Mun miehen katse.  Rakastan sua yhtä paljon.  Venetsialainen ilta.
// 151Sulje silmäni suudelmin.  Lemmen tuulet.  Tanssiva liekki.  Mun sanat
// 151totta om.  Pidän susta huolta.  Tunteet palaa sielu särkyy.  Onnen
// 151maailmaan.  Naisen vaistot.  Rakkauden yö.

// Teokset / Osakohteet
// 151Tilausteos: Kalamazoo symphony orchestra ja Gilmore keyboard
// 151festival.

// 151Innoittaja: Södergran, Edith: Animalisk hymn, runo (kirjallisuus)

// 151Säveltäjä tehnyt kuorosovituksen sävelrunostaan Finlandia, op.26
// 151orkesterille v:lta 1900.
export function handle151(fonoMap, marcRecord, Logger) {
	const data151 = fonoMap.getAllCombined('151');
	if (data151 === false) {
		Logger.log('info', 'Invalid 151 field: does not exist');
		return;
	}

	// Emot
	// käsitellään samalla kuin Fonon 150-kenttä
	// Osakohteet
	// 500 ## $a sellaisenaan
	if (!fonoMap.main()) {
		marcRecord.insertField({
			tag: '500',
			ind1: '',
			ind2: '',
			subfields: [{
				code: 'a',
				value: data151
			}]
		});
	}
}

export function handle162(fonoMap, marcRecord, Logger) {
	const data162 = fonoMap.getSingle('162');
	if (data162 === false) {
		Logger.log('info', '162 field: does not exist, or multiple fields');
		return;
	}

	// 045 0# $b d + yyyy
	// esim. d1998
	let year = data162.match(/\d{4}/);

	// These are regex from previous solution: (some capture group filtering missing)
	// https://github.com/NatLibFi/viola-scripts/blob/master/scripts/fono/fono_to_marc.pl
	// console.log('first: ', data162.match(/^[^0-9?]?[^0-9?]?([0-9?]{1,4}.+)$/))
	// console.log('second: ', temp[0].match(/^.*?\b(?:SV)?([12][0-9?]{1,3}).*$/i))
	if (year.length === 1) {
		marcRecord.insertField({
			tag: '045',
			ind1: '0',
			ind2: '',
			subfields: [{
				code: 'a',
				value: 'd' + year
			}]
		});
	} else {
		Logger.log('warn', `162 field: multiple matches or no match ${year}`);
	}
}

// 084 ## $a nnn $2 ykl ja/tai 008/18-19 Ks. lajikoodit_korjattu.txt
// Input: 'L4 L4A'
// 170L4A L6B
// 170L4A
// 170L5A
// 170L6D L3X
export function handle170(fonoMap, marcRecord, Logger, control008) {
	const data170 = fonoMap.getSingle('170');
	if (data170 === false) {
		Logger.log('info', '170 field: does not exist, or multiple fields');
		return;
	}

	let code = getGenre(data170, Logger);

	// 084 ## $a nnn $2 ykl
	marcRecord.insertField({
		tag: '084',
		ind1: '',
		ind2: '',
		subfields: [{
			code: 'a',
			value: code
		}, {
			code: '2',
			value: 'ykl'
		}]
	});

	// 008/18-19
	if (code.length === 2) {
		control008.push({ind: 18, val: code[0]}, {ind: 19, val: code[1]});
	} else {
		Logger.log('error', `170 field: invalid genre code returned: ${code}`);
	}
}

// 175heavy: death metal: melodic death
// 175punk
export function handle175(fonoMap, marcRecord, Logger) {
	const data175 = fonoMap.getSingle('175');
	if (data175 === false) {
		Logger.log('info', '175 field: does not exist, or multiple fields');
		return;
	}

	let data = data175[0].toUpperCase() + data175.slice(1);

	if (!data.match(/[.!]$/)) {
		data += '.';
	}

	// 500 ## $a [Iso alkukirjain], loppuun piste
	marcRecord.insertField({
		tag: '500',
		ind1: '',
		ind2: '',
		subfields: [{
			code: 'a',
			value: data
		}]
	});
}

export function handle180(fonoMap, marcRecord, Logger) {
	const data180 = fonoMap.getSingle('180');
	if (data180 === false) {
		Logger.log('info', '180 field: does not exist, or multiple fields');
		return;
	}

	let data = '';
	if (!data180.match(/[.!]$/)) {
		data = data180 + '.';
	}

	// 500 ## $a etutekstillä Aihepiiri:, loppuun piste
	marcRecord.insertField({
		tag: '500',
		ind1: '',
		ind2: '',
		subfields: [{
			code: 'a',
			value: 'Aihepiiri:' + data
		}]
	});
}

export function handle190and191(fonoMap, marcRecord, Logger) {
	const data190 = fonoMap.getAllCombined('190');
	const data191 = fonoMap.getAllCombined('191');

	let data = '';
	if (data190) {
		data = data190;
	}

	if (data191) {
		data += data191;
	}

	// console.log('---------- 190&191 ---------');
	// console.log("190: " + data190);
	// console.log("191: " + data191);
	// console.log("data: " + data)
	// console.log('----------------------------');

	if (data190 === false) {
		Logger.log('info', '190 field: does not exist');
	}

	// 191: samalla tavalla kuin kenttä 190 – jos 511 on jo tehty Fonon 190:stä, tämä samaan kenttään jatkoksi
	// 191: POIS kokonaan jos sisältää sanan joka alkaa ”yleistietodoku-”

	// Below specs for 190
	// Jos Fonon kentässä on " ja/tai: " tai " tai: ", niin emon 1X0- tai poikasen 7X0-kenttään,
	// päätyy vain tätä edeltänyt osa. Loppuosa talletetaan 500-kenttään. Sinne tehdään merkintä,
	// jossa myös vaihtoehtoinen/rinnakkainen/marginaalinen/outo/whatever tekijä on mukana tyyliin:

	// 500 ## $a Tekijähuomautus: eka nimi ja/tai: toka nimi.

	let persons = data.split(/\./).filter(n => n); // Split each person to array
	persons.forEach((person, ind) => {
		if (fonoMap.main()) {
			// Below specs for 190
			// Emot
			// 511 0_ $a sellaisenaan
			marcRecord.insertField({
				tag: '511',
				ind1: '0',
				ind2: '',
				subfields: [{
					code: 'a',
					value: person
				}]
			});

			if (ind === 0) {
				// ensimmäisen rivin esittäjä 100 1# $a nnn, nnn, $e esitt. (jos nimessä pilkku)
				// 110 2# $a nnn, $e esitt. (jos nimessä ei pilkkua)
				// nimen jäljessä suluissa olevat soittimet ym. jätetään pois 100/110-kentistä
				person = person.replace(/\([^()]*\)/g, '');

				if (person.match(/,/)) {
					marcRecord.insertField({
						tag: '100',
						ind1: '1',
						ind2: '',
						subfields: [{
							code: 'a',
							value: person + ','
						}, {
							code: 'e',
							value: 'esittäjä.'
						}]
					});
				} else {
					marcRecord.insertField({
						tag: '110',
						ind1: '2',
						ind2: '',
						subfields: [{
							code: 'a',
							value: person + ','
						}, {
							code: 'e',
							value: 'esittäjä.'
						}]
					});
				}
			}
		} else {
			// Below specs for 190
			// Osakohteet
			// 511 0_ $a sellaisenaan
			marcRecord.insertField({
				tag: '511',
				ind1: '0',
				ind2: '',
				subfields: [{
					code: 'a',
					value: person
				}]
			});

			// lisäksi jokainen nimi 700 1# $a nnn, nnn, $e esitt. (jos nimessä pilkku)
			// 710 2# $a nnn, $e esitt. (jos nimessä ei pilkkua)
			// nimen jäljessä suluissa olevat soittimet ym. jätetään pois 700/710-kentistä
			person = person.replace(/\([^()]*\)/g, '').filter(n => n);

			// Nimeämätön -> ei 700/710
			if (person.match(/nimeämät/i)) {
				Logger.log('warn', 'Field 19* handling encountered person matching "nimeämät"');
			} else if (person.match(/,/)) {
				marcRecord.insertField({
					tag: '700',
					ind1: '1',
					ind2: '',
					subfields: [{
						code: 'a',
						value: person + ','
					}, {
						code: 'e',
						value: 'esittäjä.'
					}]
				});
			} else {
				marcRecord.insertField({
					tag: '710',
					ind1: '2',
					ind2: '',
					subfields: [{
						code: 'a',
						value: person + ','
					}, {
						code: 'e',
						value: 'esittäjä.'
					}]
				});
			}
			// ks. Artikkelien ohitus
		}
	});
}

export function handle200(fonoMap, marcRecord, Logger) {
	const data200 = fonoMap.getSingle('200');
	if (data200 === false) {
		Logger.log('info', '200 field: does not exist, or multiple fields');
		return;
	}

	// 008/35-37 + 041 ## $d ks. ylekoodit
	// Artturi: laita 041, 008 tyhjää -> validaattori lisää 008:n koodin 041:n perusteella.
	marcRecord.insertField({
		tag: '500',
		ind1: '',
		ind2: '',
		subfields: [{
			code: 'a',
			value: 'Aihepiiri:' + data200
		}]
	});
}

export function handle222(fonoMap, marcRecord, Logger, control008) {
	const data222 = fonoMap.getSingle('222');
	if (data222 === false) {
		Logger.log('error', '222 field: does not exist, or multiple fields');
		return;
	}

	let year = data222.match(/(?:PV)?(\d{4})/);

	if (year === null) {
		Logger.log('error', `222 field: no valid year found from '${data222}'`);
		return;
	}

	if (fonoMap.main()) {
		// Emot
		// 008/07-10 yyyy + 260 ## $c pyyyy. – jos ei kenttää 224
		if (!fonoMap.exists(224)) {
			marcRecord.insertField({
				tag: '264',
				ind1: '',
				ind2: '',
				subfields: [{
					code: 'c',
					value: 'p' + year[1]
				}]
			});
		}

		if (!insertToControl(control008, 7, 4, year[1])) {
			Logger.log('error', `222 field: failed to insert to control from '${data222}'`);
		}

	// Jos on 224: 534 ## $p Alun perin julkaistu: $c pyyyy.
	} else if (fonoMap.exists(224)) {
		marcRecord.insertField({
			tag: '534',
			ind1: '',
			ind2: '',
			subfields: [{
				code: 'p',
				value: 'Alun perin julkaistu:' + year[1]
			}, {
				code: 'c',
				value: 'p' + year[1]
			}]
		});
	} else {
		// Osakohteet
		// 008/07-10 yyyy + 773 $d pyyyy – jos ei kenttää 224
		marcRecord.insertField({
			tag: '773',
			ind1: '',
			ind2: '',
			subfields: [{
				code: 'd',
				value: 'p' + year[1]
			}]
		});

		if (!insertToControl(control008, 7, 4, year[1])) {
			Logger.log('error', `222 field: failed to insert to control from '${data222}'`);
		}
	}
}

export function handle223and225(fonoMap, Logger, control008) {
	let matches = null;
	// From 225: 008/15-17 ks. ylekoodit
	if (fonoMap.exists(225)) {
		const data225 = fonoMap.getSingle('225');
		if (data225 === false) {
			Logger.log('info', '225 field: does not exist, or multiple fields');
			return;
		}

		matches = data225.match(/(?:RM)?(\d{4})/);

	// From 223: 008/15-17 – jos ei kenttää 225 ks. ylekoodit
	} else {
		const data223 = fonoMap.getSingle('223');
		if (data223 === false) {
			Logger.log('info', '223 field: does not exist, or multiple fields');
			return;
		}

		matches = data223.match(/(?:PM)?(\d{4})/);
	}

	if (matches) {
		let countryCode = getPubCountry(matches[1], Logger);
		if (!insertToControl(control008, 15, 3, countryCode)) {
			let field = '223';
			if (fonoMap.exists(225)) {
				field = '225';
			}

			Logger.log('error', `223 field: failed to insert to control from '${field}', transformed to:' ${countryCode}'`);
		}
	}
}

export function handle224(fonoMap, marcRecord, Logger, control008) {
	const data224 = fonoMap.getSingle('224');
	if (data224 === false) {
		Logger.log('info', '224 field: does not exist, or multiple fields');
		return;
	}

	let matches = data224.match(/(?:RV)?(\d{4})/);
	if (matches) {
		let year = matches[1];

		// Emot: 008/07-10 yyyy + 264 ## $c pyyyy.
		if (fonoMap.main()) {
			marcRecord.insertField({
				tag: '264',
				ind1: '',
				ind2: '',
				subfields: [{
					code: 'c',
					value: 'p' + year
				}]
			});

		// Osakohteet: 008/07-10 yyyy + 773 $d pyyyy
		} else {
			marcRecord.insertField({
				tag: '773',
				ind1: '',
				ind2: '',
				subfields: [{
					code: 'd',
					value: 'p' + year
				}]
			});
		}

		if (!insertToControl(control008, 7, 4, year)) {
			Logger.log('error', `224 field: failed to insert to control from '${data224}', transformed to:' ${year}'`);
		}
	}
}

// 008/07-10 yyyy + 260 ## $c [yyyy?] – jos ei kenttiä 222 tai 224
// NV: tätä ei enää käytetä
// Input: 'HV2017'
// function handle228() {
// }

// 230KHY Suomen Musiikki / KHYVINYYLI 090
// 230Ektro / KRYPT 112
// 230Luova / Ei kataloginumeroa
// 230Warner / 190295794224

// 230We Jazz / WJLP 02
// 230WJLP02

// 230Bafe's Factory / MBA 016
// 230Nordic Notes / NN096
// 230MBA016, NN096

// 230Virgin EMI (Universal) / 006025 5760725 3
// 23000602557607253

// 230Solina / SOL 068
// 230SOL068

// Lisätiedosta saadaan mahdollisesti apuja kentän käsittelyyn
export function handle230(fonoMap, marcRecord, Logger) {
	const data230 = fonoMap.getAll('230');
	if (data230 === false) {
		Logger.log('info', '230 field: does not exist, or multiple fields');
		return;
	}

	if (data230.length >= 4) {
		Logger.log('warn', '230 field: 4 or more lines, not specced.');
	}

	// Jos 2 riviä -> vain 1., jos 3 riviä -> 1. ja 2. molemmista omat 028-kentät
	if (data230.length === 2 || data230.length === 3) {
		data230.pop();
	}

	// Emot: 028 01 $b levymerkki $a tuotetunnus (lisätieto) - tuotetunnuksesta pois tyhjämerkit
	if (!fonoMap.main()) {
		// console.log('-------- 230 --------');
		// console.log('data: ', data230);

		data230.every(line => {
			// Ei konvertoida: ”Ei kaupallista tunnusta”, ”Ei tilausnumeroa”
			if (line.match(/(Ei kaupallista tunnusta)|(Ei tilausnumeroa)/)) {
				return true;
			}

			let elements = line.split(/\s\/\s/);
			// Levymerkki / tuotetunnus
			// levymerkki / tuotetunnus / (lisätieto)

			if (elements.length === 2) {
				elements[1] = elements[1].replace(/\s/, '');
				marcRecord.insertField({
					tag: '028',
					ind1: '0',
					ind2: '1',
					subfields: [{
						code: 'b',
						value: elements[0]
					}, {
						code: 'a',
						value: elements[1]
					}]
				});
			} else {
				Logger.log('warn', '230 field: insertion failed, not two elements');
			}

			return true;
		});
	}
}

export function handle243(fonoMap, marcRecord, Logger) {
	if (!fonoMap.main()) {
		const data243 = fonoMap.getSingle('243');
		if (data243 === false) {
			Logger.log('info', '243 field: does not exist, or multiple fields');
			return;
		}

		// Vain teokset, 12-merkkinen koodi	024 0# $a, kukin numero uuteen kenttään
		marcRecord.insertField({
			tag: '024',
			ind1: '0',
			ind2: '',
			subfields: [{
				code: 'a',
				value: data243
			}]
		});
	}
}

export function handle244(fonoMap, marcRecord, Logger, control008) {
	const data244 = fonoMap.getAllCombined('244');

	if (data244 === false) {
		Logger.log('info', '244 field: does not exist');
		return;
	}

	// Osakohteet:
	// vain 008/24 z, ei 500-kenttää
	if (!insertToControl(control008, 24, 1, 'z')) {
		Logger.log('error', `244 field: failed to insert to control from '${data244}'`);
	}

	// Emot:
	// 008/24 z + 500 ## $a sellaisenaan
	if (fonoMap.main()) {
		marcRecord.insertField({
			tag: '500',
			ind1: '',
			ind2: '',
			subfields: [{
				code: 'a',
				value: data244
			}]
		});
	}
}

// eslint-disable-next-line complexity
function getGenre(data, Logger) {
	switch (true) {
		// [/^L1A\b/ && do { $mr->insert_fields_ordered(MARC::Field->new('084', '', '', a => '78.35', 2 => 'ykl')],
		case /^L1B\b/.test(data):
			return 'pt';
		case /^L1C\b/.test(data): // $mr->insert_fields_ordered(MARC::Field->new('084', '', '', a => '78.32', 2 => 'ykl')],
			return 'sg';
		case /^L1L\b/.test(data):// 22
			return 'j';

		case /^L2\b/.test(data):
		case /^L2A\b/.test(data):
		case /^L2B\b/.test(data):
		case /^L2BB\b/.test(data):
		case /^L2L\b/.test(data): // Marc_set_pos($m008, 22,  'j';
		case /^L2N\b/.test(data):
			return 'gm';

		case /^L3\b/.test(data):
		case /^L3A\b/.test(data):
		case /^L3L\b/.test(data): // Marc_set_pos($m008, 22,  'j';
		case /^L3U\b/.test(data):
		case /^L3X\b/.test(data):
			return 'fm';

		case /^L4\b/.test(data):
		case /^L4A\b/.test(data):
		case /^L4AA\b/.test(data):
			return 'rc';

		case /^L4L\b/.test(data): // Marc_set_pos($m008, 22,  'j';
			return 'rc';

		case /^L5A\b/.test(data):
		case /^L5AA\b/.test(data):
			return 'jz';
		case /^L5B\b/.test(data):
			return 'bl';
		case /^L5L\b/.test(data): // 22
			return 'j';

		case /^L6T\b/.test(data):
			return 'df';
		case /^L6B\b/.test(data):
			return 'cy';
		case /^L6\b/.test(data):
		case /^L6C\b/.test(data):
		case /^L6D\b/.test(data):
		case /^L6L\b/.test(data): // Marc_set_pos($m008, 22,  'j';
		case /^L6V\b/.test(data):
		case /^L6X\b/.test(data):
			return 'pp';

		case /^L9E\b/.test(data):
			return 'mp';
		default:
			Logger.log('warn', `getGenre(): genre code ${data} not identified`);
			return '  ';
	}
}

// eslint-disable-next-line complexity
function getPubCountry(input, Logger) {
	switch (input) {
		case '1000': // Suomi
		case '1100': // Uusimaa
		case '1200': // Ahvenanmaa
		case '1300': // Varsinais-Suomi
		case '1400': // Satakunta ja Häme
		case '1410': // Satakunta
		case '1420': // Pirkanmaa
		case '1430': // Etelä-Häme
		case '1440': // Keski-Suomi
		case '1500': // Kymenlaakso
		case '1600': // Savo
		case '1610': // Etelä-Savo
		case '1620': // Pohjois-Savo
		case '1700': // Karjala
		case '1710': // Etelä-Karjala
		case '1720': // Pohjois-Karjala
		case '1800': // Pohjanmaa
		case '1810': // Etelä-Pohjanmaa
		case '1820': // Keski-Pohjanmaa
		case '1830': // Pohjois-Pohjanmaa
		case '1831': // Koillismaa
		case '1840': // Kainuu
		case '1850': // Peräpohjola
		case '1900': // Lappi
			return 'fi';

		// Case '2000 => '' //Skandinavia
		case '2100': // Ruotsi
			return 'sw';
		case '2200': // Norja
			return 'no';
		case '2300': // Tanska
			return 'dk';
		case '2380': // Färsaaret
			return 'dk';
		case '2390': // Grönlanti
			return 'dk';
		case '2400': // Islanti
			return 'ic';

		// Case: '3000': '' //Eurooppa
		case '3100': // Iso-Britannia ja Irlanti
		case '3110': // Englanti (ja Kanaalin ym. Saaret)
		case '3120': // Wales
		case '3130': // Skotlanti
		case '3140': // Pohjois-Irlanti
			return 'xxk';
		case '3180':
			return 'ie'; // Irlanti (tasavalta)
		case '3200':
			return 'gw'; // Saksa
		case '3310':
			return 'sz'; // Sveitsi
		case '3330':
			return 'au'; // Itävalta
		case '3410':
			return 'be'; // Belgia
		case '3420':
			return 'ne'; // Alankomaat
		case '3430':
			return 'lu'; // Luxemburg
		case '3500':
			return 'fr'; // Ranska
		case '3590':
			return 'mc'; // Monaco
		case '3610':
			return 'sp'; // Espanja
		case '3670':
			return 'po'; // Portugali
		case '3710':
			return 'it'; // Italia
		case '5100':
			return 'ru'; // Venäjä
		case '5210':
			return 'er'; // Viro
		case '5220':
			return 'lv'; // Latvia
		case '5230':
			return 'li'; // Liettua
		case '5300':
			return 'bw'; // Valkovenäjä
		case '5400':
			return 'un'; // Ukraina
		case '5500':
			return 'mv'; // Moldova
		case '5600':
			return 'ai'; // Armenia
		case '5800':
			return 'gs'; // Georgia
		case '7110':
			return 'xxc'; // 'Kanada
		case '7120':
			return 'xxu'; // 'Yhdysvallat
		case '7130':
			return 'mx'; // Meksiko
		default:
			Logger.log('warn', `getPubCountry(): country code ${input} not identified`);
			return '';
	}
}

function isOnlineMaterial(input) {
	const onlineCodes = ['0222', '1153', '1156', '1157', '1158', '1159', '1160', '2115', '3141', '7062', '7063'];
	if (onlineCodes.contains(input)) {
		return true;
	}

	return false;
}

function insertToControl(control, start, length, data) {
	if (typeof (data) !== 'string' || data.length > length) {
		return false;
	}

	data.split('').forEach((char, ind) => {
		control.push({ind: start + ind, val: char});
	});
	return true;
}

// function handleLeaderDummy() {
// 	const chars = marcRecord.leader.split('');

// 	if (chars[6] === 'o' && marcRecord.get(/^655$/).some(isBoardGame)) {
// 		chars[6] = 'r';
// 	}

// 	if (chars[18] === 'c') {
// 		chars[18] = 'i';
// 	}

// 	marcRecord.leader = chars.join('');

// 	function isBoardGame(field) {
// 		return field.subfields.some(sf => sf.code === 'a' && sf.value === 'lautapelit');
// 	}
// }

// function handle008Dummy() {
// 	const f008 = marcRecord.get(/^008$/).shift();

// 	if (f008) {
// 		const creationDate = moment().format('YYMMDD');
// 		// Convert to array, pad to 41 characters and remove first 6 chars (Creation time) and the erroneous last three chars ('nam')
// 		const chars = f008.value.split('').slice(0, 40).slice(6);

// 		if (chars[17] === ' ') {
// 			chars[17] = '^';
// 		}

// 		if (chars[18] === 'c') {
// 			chars[18] = 'i';
// 		}

// 		if (['#', '^', 'd', 'u', '|'].includes(chars[39])) {
// 			chars[39] = 'c';
// 		}

// 		f008.value = `${creationDate}${chars.join('')}`;
// 	}
// }

async function inputTestData(stream) {
	let text = await getStream(stream);
	// console.log('------------------------')
	// console.log('Inputed text: ')
	// console.log(text)
	// console.log('------------------------')
	let rec = [];
	rec = text.split(/^\*\*\*+/m).filter(n => n); // Find '***' from start of line and split by it, filter out empty
	return rec;
}

// Function streamToString (stream) {
// 	const chunks = []
// 	stream.on('data', chunk => {
// 		console.log('Pushing chunk: ', chunk)
// 		chunks.push(chunk)
// 	})
// 	stream.on('error', () => console.log('error'))
// 	stream.on('close', () => {
// 		console.log('Chunks: ', chunks)
// 		return Buffer.concat(chunks).toString('utf8')
// 	})
// }
// stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
