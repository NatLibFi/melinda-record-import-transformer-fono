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

import moment from 'moment';
import getStream from 'get-stream';
import {MarcRecord} from '@natlibfi/marc-record';
import {Utils} from '@natlibfi/melinda-commons';

const {createLogger} = Utils;

export default async function (stream) {
	MarcRecord.setValidationOptions({subfieldValues: false});

	const Logger = createLogger();
	// This is replaced with development dummy data input below
	// const records = await JSON.parse(await getStream(stream));
	const records = await inputTestData()

	//This is custom part
	console.log("--------------------");
	console.log(records);
	console.log("--------------------");
	//End of custom part

	const codes = new Map([
		[/^KAB\b/i, '78.742'],
		[/^KAF\b/i, '78.812'],
		[/^KAG\b/i, '78.65'],
		[/^KAH\b/i, '78.66'],
		[/^KAK\b/i, '78.822'],
		[/^KAP\b/i, '78.61'],
		[/^KAR\b/i, '78.871'],
		[/^KAS\b/i, '78.822'],
		[/^KAT\b/i, '78.852'],
		[/^KAV\b/i, '78.712'],
	
		[/^KKL\b/i, '78.3414'],
		[/^KKM\b/i, '78.3412'],
		[/^KKN\b/i, '78.3413'],
		[/^KKP\b/i, '78.3414'],
		[/^KKQ\b/i, '78.3411'],
		[/^KKT\b/i, '78.3414'],
		[/^KKU\b/i, '78.3414'],
	
		[/^KO\b/i, '78.54'],
		[/^KOC\b/i, '78.52'],
		[/^KOF\b/i, '78.54'],
		[/^KOJ\b/i, '78.521'],
		[/^KOW\b/i, '78.53'],
	
		[/^KW\b/i, '78.51'],
	]);

	Logger.log('debug', `Starting conversion of ${records.length} records...`);
	return Promise.all(records.map(convertRecord));

	function convertRecord(record) {
		let marcRecord = new MarcRecord();
		let fonoMap = new Map([]);
		let main = null;
		let leader000 = [];
		let control007 = [];
		let control008 = [];

		record = record.replace(/\r\n$/, '') //Remove possible extra linebreaks at end of string
		let lines = record.split(/[\r\n]+/); //Split each line to array
		lines.shift(); //Remove first, seems to be index not used in transformation
		lines.map(generateMap);

		console.log("--------- fonoMap -----------")
		console.log(fonoMap)

		handleLeader();
		handle001(); //Ok
		handle002(); //Seems to originate from index 8 of input (9th char) //This checks records type (main/sub) and sets boolean main
		handle102and104(); //ToDo: Voyager clause not checked //This dictates how 102 is handled
		handle103(); //ToDo: Yle data inconsistent with spec
		handle112(); //Ok
		handle120(); //ToDo: How data is supposed to be parsed from input?
		handle130(); //Ok
		handle140(); //Need rework as specs have been updated, do 190 simultaneously
		handle141(); //Ok
		handle150(); //ToDo: inconsistency with 505 and 245
		handle151();
		handle162();
		handle170();
		handle175(); //Ok
		handle180(); //Ok
		handle190(); //Do this at the same time as 140
		handle191(); //Do this at the same time as 190
		handle200(); //Do this
		handle222(); //Check xxxx-xxxx & xxxx&xxxx & xxxx& cases, only detects first
		handle223and225(); //Ok
		handle224(); //Ok
		//handle228(); //NV: tätä ei enää käytetä
		handle230();
		handle243();
		handle244();

		console.log("--------- marcRecord -----------")
		console.log(JSON.stringify(marcRecord, null, 2))
		console.log("Main: ", main)
		return marcRecord;

		function handleLeader() {

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


		function handle001() {
			const data001 = getSingle('001')
			if(data001 === false){
				Logger.log('error', `001 field: does not exist, or multiple fields`);
				return;
			}
			
			// 306 ## $a hhmmss (esim. 000500, 023112)
			// Input teos:   +45S-012412-A01   003:54KTV2016 TM1000             L4A     KM1 KS
			// Input aanite: +LPS-073845             KTV2015 TM1000             L5      KI KZ3S
			// Check if duration is found from data
			let data = data001.match(/[0-9]{3}:[0-5][0-9]/);

			if(data){
				let dur = moment.utc(moment.duration({
					seconds: data[0].substr(4),
					minutes: data[0].substr(0, 3)
				}).as('milliseconds')).format('HHmmss');
				marcRecord.insertField({
					tag: '306',
					ind1: '',
					ind2: '',
					subfields:[{
						code: 'a',
						value: dur
					}]
				});
			}
		}


		// Seems to originate from index 8 of input: (9th char)
		// Input "201704051PV2017"
		function handle002() {
			const data002 = getSingle('002')
			if(data002 === false){
				Logger.log('error', `002 field: does not exist, or multiple fields`);
				return;
			}

			// 1 -> 000/06-07 jm, 2 -> 000/06-07 ja
			if(data002.charAt(8) === '1'){
				main = true;
				leader000.push({ind: 6, val: 'j'},{ind: 7, val: 'm'});
			}else if(data002.charAt(8) === '2'){
				main = false;
				leader000.push({ind: 6, val: 'j'},{ind: 7, val: 'a'});
			}else{
				Logger.log('error', `Invalid 002 field: ${data002} - index 8 should be 1 or 2, is: ${data.charAt(8)}`);
			}
		}


		// Huomaa, että Voyageriin viedessä viennin jälkeen on ajettu fono_relink.perl, joka korvaa emojen 035$a:n ja 
		// poikastaen 773$w tietokannan oikealla id:llä. Jos v98* tai v81*, niin myös tämä arvo on jätetty emon 
		// 035$a-kenttään. (v98 jätetään saapumisvalvonnan ja v81 jonkun mahdollisen Mikkelin digitointiseurantatarpeen takia.)

		//isOnlineMaterial(input) <- used in new spec to detect special case
		function handle102and104() {
			const data102 = getSingle('102')
			const data104 = getSingle('104')
			if(data102 === false && data104 === false){
				Logger.log('error', `102 or 104 field: does not exist, or multiple fields`);
				return;
			}
			let tag = null;
			let code = null;
			
			if(main){
				tag = '035'
				code = 'a'
			}else{
				tag = '773'
				code = 'w'
			}

			switch (data104) {
				case 'CD':{
					// emot: 035 ## $a v81xxxxxx
					// osakohteet: 773 ## $w v81xxxxxx
					marcRecord.insertField({
						tag: tag,
						ind1: '',
						ind2: '',
						subfields:[{
							code: code,
							value: 'v81' + data102
						}]
					});

					//Lisäksi emoon:
					if(main){
						// 007/00 s, 007/01/ d, 007/03 f, 007/06 g, 007/10 m
						control007.push({ind: 0, val: 's'}, {ind: 1, val: 'd'}, {ind: 3, val: 'f'}, {ind: 6, val: 'g'}, {ind: 10, val: 'm'});

						// 300 ## $a 1 CD-äänilevy.
						marcRecord.insertField({
							tag: '300',
							ind1: '',
							ind2: '',
							subfields:[{
								code: 'a',
								value: '1 CD-äänilevy'
							}]
						});

						// 338 ## $a äänilevy $b sd $2 rdacarrier
						insert338('äänilevy', 'sd')
					}
					
					return;
				}

				case '33rpm.':{
					// emot: 035 ## $a v95xxxxxx
					// osakohteet: 773 ## $w v95xxxxxx
					marcRecord.insertField({
						tag: tag,
						ind1: '',
						ind2: '',
						subfields:[{
							code: code,
							value: 'v95' + data102
						}]
					});

					
					//Lisäksi emoon:
					if(main){
						// 007/00 s, 007/01 d, 007/03 b, 007/06 e, 007/10 p
						control007.push({ind: 0, val: 's'}, {ind: 1, val: 'd'}, {ind: 3, val: 'b'}, {ind: 6, val: 'e'}, {ind: 10, val: 'p'});

						// emoon 300 ## $a 1 äänilevy.
						marcRecord.insertField({
							tag: '300',
							ind1: '',
							ind2: '',
							subfields:[{
								code: 'a',
								value: '1 äänilevy.'
							}]
						});

						// 338 ## $a äänilevy $b sd $2 rdacarrier
						insert338('äänilevy', 'sd')

						// 344 ## $c 33 1/3 kierr./min
						marcRecord.insertField({
							tag: '344',
							ind1: '',
							ind2: '',
							subfields:[{
								code: 'c',
								value: '33 1/3 kierr./min'
							}]
						});
					}
					return;
				}

				case '45rpm.':{
					// emot: 035 ## $a v96xxxxxx
					// osakohteet: 773 ## $w v96xxxxxx
					marcRecord.insertField({
						tag: tag,
						ind1: '',
						ind2: '',
						subfields:[{
							code: code,
							value: 'v96' + data102
						}]
					});

					//Lisäksi emoon:
					if(main){
						// 007/00 s, 007/01 d, 007/03 c, 007/06 c, 007/10 p
						control007.push({ind: 0, val: 's'}, {ind: 1, val: 'd'}, {ind: 3, val: 'c'}, {ind: 6, val: 'c'}, {ind: 10, val: 'p'});

						// emoon 300 ## $a 1 äänilevy : $b 45 kierr./min.
						marcRecord.insertField({
							tag: '300',
							ind1: '',
							ind2: '',
							subfields:[{
								code: 'a',
								value: '1 CD-äänilevy'
							}]
						});

						// 338 ## $a äänilevy $b sd $2 rdacarrier
						insert338('äänilevy', 'sd')

						// 344 ## $c 45 kierr./min
						marcRecord.insertField({
							tag: '344',
							ind1: '',
							ind2: '',
							subfields:[{
								code: 'c',
								value: '45 kierr./min'
							}]
						});
					}
					return;
				}

				case 'Nauha':{
					// emot: 035 ## $a v80xxxxxx
					// osakohteet: 773 ## $w v80xxxxxx
					marcRecord.insertField({
						tag: tag,
						ind1: '',
						ind2: '',
						subfields:[{
							code: code,
							value: 'v80' + data102
						}]
					});

					//Lisäksi emoon:
					if(main){
						// 007/00 s, 007/01 s, 007/03 l, 007/06 j, 007/10 p + 
						control007.push({ind: 0, val: 's'}, {ind: 1, val: 's'}, {ind: 3, val: 'l'}, {ind: 6, val: 'j'}, {ind: 10, val: 'p'});

						// emoon 300 $a 1 C-kasetti.
						if(main){
							marcRecord.insertField({
								tag: '300',
								ind1: '',
								ind2: '',
								subfields:[{
									code: 'a',
									value: '1 C-kasetti.'
								}]
							});
						}
					}
					
					return;
				}
				
				case '78':{
					// emot: 035 ## $a v97xxxxxx
					// osakohteet: 773 ## $w v97xxxxxx
					marcRecord.insertField({
						tag: tag,
						ind1: '',
						ind2: '',
						subfields:[{
							code: code,
							value: 'v97' + data102
						}]
					});

					//Lisäksi emoon:
					if(main){
						// 007/00 s, 007/01 d, 007/03 d, 007/06 d, 007/10 |
						control007.push({ind: 0, val: 's'}, {ind: 1, val: 'd'}, {ind: 3, val: 'd'}, {ind: 6, val: 'd'}, {ind: 10, val: '|'});
						
						// 300 ## $a 1 äänilevy
						marcRecord.insertField({
							tag: '300',
							ind1: '',
							ind2: '',
							subfields:[{
								code: 'a',
								value: '1 äänilevy'
							}]
						});

						// 344 ## $c 78 kierr./min
						marcRecord.insertField({
							tag: '344',
							ind1: '',
							ind2: '',
							subfields:[{
								code: 'b',
								value: '78 kierr./min.'
							}]
						});
					}

					return;
				}


				case 'Audiofile':{
					// emot: 035 ## $a v98xxxxxx
					// osakohteet: 773 ## $w v98xxxxxx
					marcRecord.insertField({
						tag: tag,
						ind1: '',
						ind2: '',
						subfields:[{
							code: code,
							value: 'v98' + data102
						}]
					});

					// Jos Fonon 246 on verkkoaineistokoodi, niin
					if(isOnlineMaterial()){
						// 006 m||||| o||h||||||||
						marcRecord.insertField({
							tag: '006',
							value: 'm||||| o||h||||||||'
						})

						// 007/00 s, 007/01 r, 007/03-12 |n|||||||||
						control007.push({ind: 0, val: 's'}, {ind: 1, val: 'r'}, {ind: 3, val: '|'}, {ind: 4, val: 'n'}, 
										{ind: 5, val: '|'}, {ind: 6, val: '|'}, {ind: 7, val: '|'}, {ind: 8, val: '|'}, 
										{ind: 9, val: '|'}, {ind: 10, val: '|'}, {ind: 11, val: '|'}, {ind: 12, val: '|'});

						// ToDo: 	008/23 o (vrt. VIOLA-55 - Authenticate to see issue details  )

						// 337 ## $a tietokonekäyttöinen $b c $2 rdamedia
						marcRecord.insertField({
							tag: '300',
							ind1: '',
							ind2: '',
							subfields:[{
								code: 'a',
								value: 'tietokonekäyttöinen'
							},{
								code: 'b',
								value: 'c'
							},{
								code: '2',
								value: 'rdamedia'
							}]
						});

						// 338 ## $a verkkoaineisto $b cr $2 rdacarrier
						insert338('verkkoaineisto', 'cr')
						
						// 347 ## $a äänitiedosto
						marcRecord.insertField({
							tag: 347,
							ind1: '',
							ind2: '',
							subfields:[{
								code: a,
								value: 'äänitiedosto'
							}]
						});

					// muuten
					}else{
						// 007/00 s, 007/01 d 007/03 f, 007/06 g, 007/10 m
						control007.push({ind: 0, val: 's'}, {ind: 1, val: 'd'}, {ind: 3, val: 'f'}, {ind: 6, val: 'g'}, {ind: 10, val: 'm'});

						// 008/24 välilyönti
						insertToControl008(24, 1, ' ');

						// 300 ## $a 1 CD-äänilevy.
						marcRecord.insertField({
							tag: '300',
							ind1: '',
							ind2: '',
							subfields:[{
								code: 'a',
								value: '1 äänilevy'
							}]
						});

						// 338 ## $a äänilevy $b sd $2 rdacarrier
						insert338('äänilevy', 'sd')
					}

					return;
				}
			}

			function insert338(subfieldA, subfieldB = 'sd'){
				marcRecord.insertField({
					tag: '338',
					ind1: '',
					ind2: '',
					subfields:[{
						code: 'a',
						value: subfieldA
					},{
						code: 'b',
						value: subfieldB
					},{
						code: '2',
						value: 'rdacarrier'
					}]
				});
			}
		}


		// ToDo: input does not match specs
		// Input: 'A01'
		function handle103() {
			//vain teokset	
			if(!main){
				const data103 = getSingle('103')
				if(data103 === false){
					Logger.log('error', `103 field: does not exist, or multiple fields`);
					return;
				}

				// 1. Remove leading zeroes with regex as it is needed in any case
				let reg = /(0*)([1-9])/g //This seems to be working with capture groups

				// console.log("main: ", main)
				// console.log("------ regex tests ------")
				// console.log('A01 -> ', 'A01'.replace(reg, '$2'))
				// console.log('A01-A02 -> ', 'A01-A02'.replace(reg, '$2'))
				// console.log('02-03 -> ', '02-03'.replace(reg, '$2'))
				// console.log('01-10 -> ', '01-10'.replace(reg, '$2'))
				// console.log('001-10 -> ', '001-10'.replace(reg, '$2'))
				// console.log('0002-0003 -> ', '0002-0003'.replace(reg, '$2'))
				// console.log("-------------------------")	
				// console.log(data103, '', data103.replace(reg, '$2'))

				let data = data103.replace(reg, '$2')
				let value = 'R';

				// console.log(data)
				// console.log("-------------------------")

				// let regif = /\w\d/g;
				// console.log('Regif: ', data.match(regif))	
				//data = '1:3-1:4'
				//data = '1:3'


				// Possibilities:
				// 1:02 -> Levy 1, raita 2
				// 1:03-1:04 -> Levy 1, raidat 3-4
				// 01 -> Raita 1
				// 01-08 -> Raidat 1-8
				// A1 -> A-puoli, raita 1 //ToDo


				// 2. Detect if need to separate by record
				// ToDo: Check records spec as records from Yle are in format 'A01'
				// jos monta levyä (esim. 1:02) -> 773 ## $g Levy 1, raita 2
				// (esim. 1:03-1:04) -> 773 ## $g Levy 1, raidat 3-4
				if(data.match(/\d:\d/g) || data.match(/\w\d/g)){
					let structure = null;
					if(data.match(/\d:\d/g)){
						console.log("Match ':' with data: ", data, ", results: ")
						console.log(data.split(/(\d):(\d)/).filter(n => n));
						//'1:3' => [ '1', ':', '3' ]
						//'1:3-1:4' => [ '1', ':', '3', '-', '1', ':', '4' ]
					}
					///^\w(?=\d)/g
					if(data.match(/\w\d/g)){
						console.log("Match '\w' with data: ", data, ", results: ", data.split(/(^\w)/g).filter(n => n))
						structure = data.split(/(^\w)/g).filter(n => n); //Split by char at start of string
						//'A1' => [ 'A', '1' ]
					}
					console.log("Structure: ", structure)
				}

				// 3. Detect if need to rename tracks
				// osakohteet: 773 ## $g Raita [numero], muuta 01->1, 02->2 jne.
				// jos monta uraa (esim. 01-08) -> 773 ## $g Raidat [numero-numero], muuta 01->1, 02->2 jne.


				// 4. Insert transformation
				marcRecord.insertField({
					tag: '773',
					ind1: '',
					ind2: '',
					subfields:[{
						code: 'g',
						value: value
					}]
				});
			}
		}


		function handle112() {
			const data112 = getSingle('112')
			const data120 = getSingle('120')
			if(data112 === false){
				Logger.log('info', `112 field: does not exist, or multiple fields`);
				return;
			}
			
			// 518 ## $a Äänitetty: yyyy.
			// jos myös Fonon 120 -> 518 ## $a Äänitetty: yyyy,
			let value = null;
			if(data120){
				value = 'Äänitetty: ' + data112.match(/[0-9]{4}/)[0] + ','
			}else{
				value = 'Äänitetty: ' + data112.match(/[0-9]{4}/)[0] + '.'
			}

			marcRecord.insertField({
				tag: '518',
				ind1: '',
				ind2: '',
				subfields:[{
					code: 'a',
					value: value
				}]
			});
		}


		// 518 ## $o $d $p $3
		// Radiolähetys/livetieto tms. menee 518:n $o-osakenttään suluissa. (pakollinen)
		// Fonon 120:sta tuleva vuosi menee 518$d:hen (optionaalinen)
		// Esityspaikka menee 518$p:hen (optionaalinen)
		// Raidat menevät 518$3:een (optionaalinen)
		// 033-kenttä luodaan esitysajankohtien perusteella. ind1 voi olla 0, 1 tai 2 noiden määrän perusteella, ind2=0. $a-osakenttään tulee tieto ajankohdasta suomenkielellä. Paikkatietoja tänne ei ole laitettu.
		
		// ToDo: How data is supposed to be parsed from input?
		// Input: 'Helsinki: Dubrovnik: We Jazz Festival 20151211 (live).'
		function handle120() {
			const data120 = getSingle('120')
			if(data120 === false){
				Logger.log('info', `120 field: does not exist, or multiple fields`);
				return;
			}

			let subfields = [];

			// console.log("---------------------------------")
			// console.log("Data: ", data120)
			// console.log(data120.match(/\([\w]*\)/))

			//120Helsinki: Dubrovnik: We Jazz Festival 20151211 (live).
			//1202007102007 (live).
			//120Äänitys ja miksaus: Suomi, Saksa.
			//120Helsinki: Savoy 20151231 (live).
			//120Tampere: Ratinan stadion 20160806 (live).
			//120Forssan teatteritalo 19730819 (live).
			//120Somero: Esakallio 20170421 (live).
			//120Tuulos: Kapakanmäki 20170428 (live).
			//120Seinäjoki: Provinssirock 19900603 (live).
			//120Helsinki: Kulttuuritalo
			//120Helsinki: Liisankadun Studio 19740313 (radio-ohjelma, Yle 2) (live).
			//120Hollola: Sovituksen kirkko.
			//120Tampere: Olympiasali 20170401 (live).
			//120Äänitys: Suomi ja Tsekki.
			//120Äänitys: Suomi, UK.
			//120Äänitys: Norja 2014 /urat 02-03,05-08; Äänitys: Norja 2016? /ura 04.
			//120Pori: Työväentalo 1957 (live).
			//120Äänitys: Suomi ja/tai: USA.
			//120Äänitys: Yhdysvallat (USA), Iso-Britannia (UK).
			//120Muenchen: Herkulessaal 201501 (live).
			//120Amsterdam: Concertgebouw 20151218&20 (live).
			//120Utsjoki: Pub Rastigaisa 2015 (live /14).
			//120Live /Osittain.
			//120Helsinki: Tunnelmasta toiseen 1963 (tv-ohjelma, Yleisradio).
			//12019771003.
			//12019781214-15.
			//120Tukholma 197902.
			//120198003.
			//120Live.

			//Jatkuu useammalle riville:
			//120Äänitys: Suomi, Ruotsi, Slovakia, Tshekki, Yhdysvallat (USA), Saksa,
			//120Englanti (UK).


			let data = data120.match(/\([\w]*\)/);
			if(data){
				subfields.push({code: 'o', value: data[0]})
			}

			marcRecord.insertField({
				tag: '518',
				ind1: '',
				ind2: '',
				subfields: subfields
			});
		}

		
		function handle130() {
			const data130 = getAll('130')
			let tag = {
				tag: '245',
				ind1: '',
				ind2: '',
				subfields: []
			};
			if(data130 === false || data130.length === 0){
				Logger.log('info', `130 field: does not exist`);
				return;
			}

			data130.forEach(function(line, ind) {
				// jos rivien sisältö on (kokoelma), (kokonaisjulkaisu), (hittikokoelma) -> ei konvertoida
				if(line === '(kokoelma)' || line ===  '(kokonaisjulkaisu)' || line === '(hittikokoelma)'){
					return;
				}

				// jos tekstiä ”Omistus”, ”Tässä” -> 500 ## $a sellaisenaan
				if(line.match(/(omistus)|(tässä)/i)){
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

				// jos tekstiä ”A-puoli”, ”B-puoli” -> 505 0# $a sellaisenaan
				if(line.match(/(a-puoli)|(b-puoli)/i)){
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

				if(ind === 0){
					if(main){
						// Emo: eka rivi 245 00 $a pienaakkosilla – ks. Artikkeleiden ohitus
						tag.subfields.push({code: 'a', value: line.toLowerCase()});
						// Emo: lisätään aina 245 $a-kentän jälkeen $h [Äänite]
						tag.subfields.push({code: 'h', value: '[Äänite]'});
					}else{
						// Osakohteet: 773 $t – vain eka rivi pienaakkosilla
						tag.tag = '773';
						tag.subfields.push({code: 't', value: line.toLowerCase()});
					}
				}else{
					// Toinen ja seuraavat rivit 245 osakenttään $b, osakenttää $b edeltää tyhjämerkki, kaksoispiste, tyhjämerkki ( : )
					tag.subfields.push({code: 'b', value: ' : ' + line});
				}

				marcRecord.insertField(tag);
			});	
		}

		

		// ToDO: Viola implementation
		// NVOLK: nykyään nuo aukikirjoitetaan: säv. → säveltäjä jne (loppupisteen olemassaolo riippuu kontekstista)
		// NVOLK: Huom. Fono ei kerro, onko kysessä ihminen vai yhteisötekijä (eli suomeksi tässä kontekstissa käytännössä aina yhtye). Jos nimi löytyy Violan tekijäauktoriteettitietueista, niin silloin käytetään sen mukaista tulkintaa. Muuten valistunut arvaus. (Esim. "the" tai yksisananinen tekijä indikoi yleensä yhtyettä,)
		// NVOLK: Fonon nimiä (ja elinvuosia) verrataan Violan tekijäauktoriteettitietuiden nimiin ja salanimiin/taiteilijanimiin. Tarvittaessa Fonosta tuleva nimi vaihdetaan Violaan auktoriteettitietueen 1X0-kentän nimeen. (Esim. jos Fonon nimi löytyy vain auktoriteettitietueen 400-kentässä, niin saatetaankin käyttää auktoriteettitietueen 100-kentässä olevaa nimeä luotavassa tietueessa.)
		// NVOLK: Lisäksi noihin luotaviin tietueisiin on takautuvassa ajossa lisätty tekijöille elinvuodet. Tän varmaan voi toteuttaa Melindassa jotenkin fiksummin.
		// Kentästä voidaan saada myös Musiikin esityskokoonpano -tietoa kenttään 500, ja jotain Kansansävelmä-tietoa kenttään 381.
		function handle140() {
			const data001 = getSingle('001') //Used to search L1
			const data170 = getSingle('170') //Used to search L1
			const data140 = getAllCombined('140')

			if(data140 === false){
				Logger.log('info', `140 field: does not exist`);
				return;
			}

			// * henkilönnimistä pois syntymä- ja kuolinvuodet, esim. Mancini, Henry [1924-1994] (säv) -> 700 1# $a Mancini, Henry, $e säveltäjä.
			let data = data140.replace(/(\[[\d\-\s]*\])/g, '');
			// * nimen jälkeinen /pseud/ pois
			data = data.replace(/(\/pseud\s\/)/g, '')

			let persons = data.split(/\./).filter(n => n); //Split each person to array
			let sorted700Fields = [];

			persons.forEach(function(person, ind){
				// * molemmissa Nimeämätön ja Anonyymi jätetään pois
				if(person.match(/(nimeämätön)|(anonyymi)/i)){
					return;
				}

				//Split by parenthesis, but not with pseudonym explanation
				let elements = person.split(/(\([^\=].*\))/).filter(n => n);
				if(elements.length > 2){
					Logger.log('error', `140 field: ppl has more than two components: ${elements}`);
					return;
				}

				if(elements.length === 0){
					Logger.log('error', `140 field: ppl has no valid components: ${elements}`);
					return;
				}

				let name = elements[0].replace(/(^\s+)|(\s+$)/g, '') //Remove whitespaces from start and end of name
				let comma = name.match(/^[^\(]+\,[^\(]+/);
				let functions = null;
				if(elements.length === 2){
					functions = elements[1].match(/(säv)|(san)|(sov)|(esitt)/gi);
				}

				if(functions !== null){
					functions.forEach(function(func){
						let field = getField(func);

						// * 700-kentät järjestykseen -> säv, san, sov, esitt (low priority)
						if(field.tag === '700'){
							sortArr(field);
						}else{
							marcRecord.insertField(field);
						}
					});

				}else{
					marcRecord.insertField(getField());
				}
				
				function getField(func){
					let subfields = null;
					// * jos ei suluissa olevaa funktiomerkintöä, osakenttä $e jää pois ja osakentän $a pilkku (,) muutetaan pisteeksi (.)
					if(typeof(func) === 'undefined'){
						subfields = [{
							code: 'a',
							value: name + '.'
						}];
					}else{
						subfields = [{
							code: 'a',
							value: name + ','
						},{
							code: 'e',
							value: func
						}];
					}

					// Äänitteet (main)
					if(main){
						// jos Fonon 001/170:ssa L1 (=taidemusiikki), ensimmäinen nimi ->
						// 100 1# $a nnn, nnn, $e säv.
						if(ind === 0 && (data001 && data001.match(/L1/g)) || (data001 && data170.match(/L1/g))){
							return {
								tag: '100',
								ind1: '1',
								ind2: '',
								subfields: [{
									code: 'a',
									value: name + ','
								},{
									code: 'e',
									value: 'säv.'
								}]
							};
						}
	
						// muulloin kaikki nimet näin:
						// 700 1# $a nnn, nnn, $e [funktio] (jos nimessä pilkku)
						if(comma){
							return{
								tag: '700',
								ind1: '1',
								ind2: '',
								subfields: subfields
							};
	
						// 710 2# $a nnn, $e [funktio] (jos nimessä ei pilkkua)
						}else{
							return {
								tag: '710',
								ind1: '1',
								ind2: '',
								subfields: subfields
							};
						}
	
					// Teokset / Osakohteet
					}else{
						if(ind === 0){
							if(comma){
								// 100 1# $a nnn, nnn, $e säv. (1. nimi, jos nimessä pilkku)
								return{
									tag: '100',
									ind1: '1',
									ind2: '',
									subfields: [{
										code: 'a',
										value: name + ','
									},{
										code: 'e',
										value: 'säv.'
									}]
								};
							}else{
								// 110 2# $a nnn, $e säv. (1. nimi, jos nimessä ei pilkkua)
								return {
									tag: '110',
									ind1: '2',
									ind2: '',
									subfields: [{
										code: 'a',
										value: name + ','
									},{
										code: 'e',
										value: 'säv.'
									}]
								};
							}
						}
	
						if(comma){
							// 700 1# $a nnn, nnn, $e [funktio] (1. nimen muut funktiot + muut nimet, jos pilkku)
							return {
								tag: '700',
								ind1: '1',
								ind2: '',
								subfields: subfields
							};
	
						}else{
							// 710 2# $a nnn, $e [funktio] (1. nimen muut funktiot + muut nimet, jos ei pilkkua)
							return {
								tag: '710',
								ind1: '2',
								ind2: '',
								subfields: subfields
							};
						}
					}
				}
							
				function sortArr(field){
					var orderArr = [/säv/i, /san/i, /sov/i, /esitt/i];

					if (sorted700Fields.length >= 1) {
						var indexInserted = orderArr.findIndex(a => field.subfields[1].value.match(a))
						var indexPos = 0;

						sorted700Fields.forEach(element => {
							if (orderArr.findIndex(a => element.subfields[1].value.match(a)) <= indexInserted) {
								indexPos++;
							}
						});

						sorted700Fields.splice(indexPos, 0, field);
					} else {
						sorted700Fields.push(field);
					}
				}
			})
			
			//Finally insert sorted fields
			if(sorted700Fields.length > 0){
				sorted700Fields.forEach(function(field){
					marcRecord.insertField(field)
				})
			}
		}


		function handle141() {
			const data141 = getAllCombined('141')
			if(data141 === false){
				Logger.log('info', `Invalid 141 field: does not exist`);
				return;
			}

			// 500 ## $a etutekstillä: Tekijähuomautus:
			marcRecord.insertField({
				tag: '500',
				ind1: '',
				ind2: '',
				subfields:[{
					code: 'a',
					value: 'Tekijähuomautus: ' + data141
				}]
			});
		}





		// *********************
		// tark. taidemusiikin moniriviset nimekkeet! esim.:
		// Näin:
		// ensimmäinen 150-rivi 245 $a, muut kaksoispisteen jälkeen kenttään 245 $b.
		// 1501, 1502 jne. kenttään
		// 505 0# $a Osat: 15001-rivin teksti ; 15002-rivin teksti ; 15003-rivin teksti ; 15004-rivin teksti.
		// *********************

		// ToDo: inconsistency with 505 and 245
		function handle150() {
			let data150 = getAllCombined('150')
			if(data150 === false){
				Logger.log('info', `Invalid 150 field: does not exist`);
				return;
			}

			console.log("-------------------------")
			console.log(data150)

			// Emot
			// ensimmäinen rivi -> 245 10 $a – ks. Artikkeleiden ohitus
			// Artikkelit pilkulla erotettuna nimekkeen perässä, konvertoidaan nimekkeen alkuun – esim. 150Old rugged cross, The -> 245 14 $a The old rugged cross
			// NV: Tässä voidaan olla 130->245-kohtaa liberaalimpia: jos lopussa pilkku ja näyttää artikkelilta, niin siirretään artikkeli ja asetetaan 245 ind2 siirretyn merkkijonon pituuden perusteella (+1).

			// lisätään aina 245 $a-kentän jälkeen $h [Äänite]
			// muut rivit: jos sulkeet ja lopussa viiva (-) -> 031 ## $t, sulkeet ja loppuviiva pois

			// jos sulkeet ja yhtäläisyysmerkki (=) -> = 245 $b, sulkeet ja = pois
			// jos sulkeet ilman = ja - -> 500 ## $a, sulkeet pois, iso alkukirjain
			if(main){


			// Osakohteet
			// 505 0# $a Xxxx ; Xxxx ; Xxxx ; Xxxx.
			// Fonossa piste ja kaksi tyhjämerkkiä erottaa eri teokset -> korvataan Violassa
			// tyhjämerkki puolipiste tyhjämerkki –yhdistelmällä
			}else{
				
			}

			//Emot:
			// 150Moorland elegies, sarja sekakuorolle ja jousiorkesterille.
			// 150Walkuere, Die (Valkyyria), ooppera: 1. näytös kokonaan.

			// 150Tuntematon sotilas
			// 150elokuva (Suomi 2017); ohjaaja: Louhimies, Aku (soundtrack).


			// Teoksia:
			// 150Rocktown special
			// 150L. A. woman

			// 1508 foot Joe
			// 150(hakuapu: Eight foot Joe).

			// 150Jenkki purukumi
			// 150(Hi there Jenkki lovers -).

			// 150Kätkävaaran lohikäärme
			// 150(Dragon of Kätkävaara, The)

			// 150Ensimmäinen aamu
			// 150(First morning).

			// 150Konsertto pianolle ja orkesterille.
			// 15001  1. (attacca) /7:43.
			// 15002  - 2. /12:59.
			// 15003  3. /9:34.

			// 150Konsertto sellolle ja orkesterille.
			// 15004  1. /9:51.
			// 15005  2. /10:53.
			// 15006  3. /2:05.
			// 15007  Sonate 1-2-3 (sellolle ja pianolle) (attacca) /2:55.
			// 15008  - La plus que lente /7:38.

			// 1501. Kuortaneen menuetti.  -
			// 1502. Slängpolska efter Juringius.

			// 500 ## $a etutekstillä: Tekijähuomautus:
			// data150.forEach(function(line) {
				//console.log("Line: ", line); 

				// marcRecord.insertField({
				// 	tag: '505',
				// 	ind1: '0',
				// 	ind2: '',
				// 	subfields:[{
				// 		code: 'a',
				// 		value: 'Tekijähuomautus: ' + line
				// 	}]
				// });
			// });

		}


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
		function handle151() {
			const data151 = getAllCombined('151');
			if(data151 === false){
				Logger.log('info', `Invalid 151 field: does not exist`);
				return;
			}

			// Emot
			// 505 0_ $a xxxx ; xxxx ; xxxx.
			// Fonossa piste ja kaksi tyhjämerkkiä erottaa eri teokset -> korvataan Violassa
			// tyhjämerkki puolipiste tyhjämerkki –yhdistelmällä
			// ToDo: jos kenttä on jo muodostettu 150-kentästä, tämä sen jatkoksi – harvinaista
			if(main){
				let data = data151.replace(/\.\s{2}/g, ' ; ');
				data = data.replace(/\.$/, '');
				marcRecord.insertField({
					tag: '505',
					ind1: '',
					ind2: '',
					subfields:[{
						code: 'a',
						value: data
					}]
				});
			// Osakohteet
			// 500 ## $a sellaisenaan
			}else{
				marcRecord.insertField({
					tag: '500',
					ind1: '',
					ind2: '',
					subfields:[{
						code: 'a',
						value: data151
					}]
				});
			}
		}


		// 162SV1932
		// 162SV1902 valm
		// 162SV1684 julk
		// 162SV1743 noin
		// 162SV2016 ensi
		// 162SV1900 uud
		// 162SV1903 ork
		// 162SV2016 sov
		//1 62SV1500-luku
		function handle162() {
			const data162 = getSingle('162')
			if(data162 === false){
				Logger.log('info', `162 field: does not exist, or multiple fields`);
				return;
			}

			// 045 0# $b d + yyyy
			// esim. d1998
			let year = data162.match(/\d{4}/)

			// These are regex from previous solution: (some capture group filtering missing)
			// https://github.com/NatLibFi/viola-scripts/blob/master/scripts/fono/fono_to_marc.pl
			// console.log("first: ", data162.match(/^[^0-9?]?[^0-9?]?([0-9?]{1,4}.+)$/))
			// console.log("second: ", temp[0].match(/^.*?\b(?:SV)?([12][0-9?]{1,3}).*$/i))
			if(year.length === 1){
				marcRecord.insertField({
					tag: '045',
					ind1: '0',
					ind2: '',
					subfields:[{
						code: 'a',
						value: 'd' + year
					}]
				});
			}else{
				Logger.log('warn', `162 field: multiple matches or no match ${year}`);
			}
		}


		// 084 ## $a nnn $2 ykl ja/tai 008/18-19 Ks. lajikoodit_korjattu.txt
		// Input: "L4 L4A"
		// 170L4A L6B
		// 170L4A
		// 170L5A
		// 170L6D L3X
		function handle170() {
			const data170 = getSingle('170')
			if(data170 === false){
				Logger.log('info', `170 field: does not exist, or multiple fields`);
				return;
			}

			let code = getGenre(data170)

			// 084 ## $a nnn $2 ykl			
			marcRecord.insertField({
				tag: '084',
				ind1: '',
				ind2: '',
				subfields:[{
					code: 'a',
					value: code
				},{
					code: '2',
					value: 'ykl'
				}]
			});

			// 008/18-19
			if( code.length === 2 ){
				control008.push({ind: 18, val: code[0]},{ind: 19, val: code[1]});
			}else{
				Logger.log('error', `170 field: invalid genre code returned: ${code}`);
			}
		}


		// 175heavy: death metal: melodic death
		// 175punk
		function handle175() {
			const data175 = getSingle('175')
			if(data175 === false){
				Logger.log('info', `175 field: does not exist, or multiple fields`);
				return;
			}

			console.log("Data175: ", data175)
			let data = data175[0].toUpperCase() + data175.slice(1);

			if(!data.match(/[.!]$/)){
				data = data + '.';
			}

			// 500 ## $a [Iso alkukirjain], loppuun piste
			marcRecord.insertField({
				tag: '500',
				ind1: '',
				ind2: '',
				subfields:[{
					code: 'a',
					value: data
				}]
			});
		}
		

		function handle180() {
			const data180 = getSingle('180')
			if(data180 === false){
				Logger.log('info', `180 field: does not exist, or multiple fields`);
				return;
			}

			let data = '';
			if(!data180.match(/[.!]$/)){
				data = data180 + '.';
			}

			// 500 ## $a etutekstillä Aihepiiri:, loppuun piste
			marcRecord.insertField({
				tag: '500',
				ind1: '',
				ind2: '',
				subfields:[{
					code: 'a',
					value: 'Aihepiiri:' + data
				}]
			});
		}


		// Emot
		// 511 0_ $a sellaisenaan
		// ensimmäisen rivin esittäjä 100 1# $a nnn, nnn, $e esitt. (jos nimessä pilkku)
		// 110 2# $a nnn, $e esitt. (jos nimessä ei pilkkua)
		// nimen jäljessä suluissa olevat soittimet ym. jätetään pois 100/110-kentistä

		// Osakohteet
		// 511 0_ $a sellaisenaan
		// lisäksi jokainen nimi 700 1# $a nnn, nnn, $e esitt. (jos nimessä pilkku)
		// 710 2# $a nnn, $e esitt. (jos nimessä ei pilkkua)
		// nimen jäljessä suluissa olevat soittimet ym. jätetään pois 700/710-kentistä
		// Nimeämätön -> ei 700/710
		// ks. Artikkelien ohitus

		// Input: "Iron Magazine (yhtye)."
		
		//Äänitteet
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

		function handle190() {
			const data190 = getAllCombined('190')

			if(data190 === false){
				Logger.log('info', `190 field: does not exist`);
				return;
			}


		}



		// Input: "syntetisaattori)."
		//Äänitteet
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

		//Teos
		// 191Yhtyeen jäsenet lueteltu esittelylehtisessä.
		// 191Orkesterin jäsenet lueteltu tekstilehtisessä.
		// 191Yhtyeen jäsenet ja avustajat lueteltu oheistiedoissa.
		// 191Yhtyeen jäsenet lueteltu yleistietodokumentissa ja oheistiedoissa.

		function handle191() {
			const data191 = getAllCombined('191')

			if(data191 === false){
				Logger.log('info', `191 field: does not exist`);
				return;
			}

			// POIS kokonaan jos sisältää sanan joka alkaa ”yleistietodoku-”
			if(data191.match(/\byleistietodoku/i)){
				return;
			}

			// samalla tavalla kuin kenttä 190 – jos 511 on jo tehty Fonon 190:stä, tämä samaan kenttään jatkoksi
		}


		function handle200() {
			const data200 = getSingle('200')
			if(data200 === false){
				Logger.log('info', `200 field: does not exist, or multiple fields`);
				return;
			}

			// 008/35-37 + 041 ## $d ks. ylekoodit
			// Artturi: laita 041, 008 tyhjää -> validaattori lisää 008:n koodin 041:n perusteella.
			marcRecord.insertField({
				tag: '500',
				ind1: '',
				ind2: '',
				subfields:[{
					code: 'a',
					value: 'Aihepiiri:' + data200
				}]
			});
		}


		function handle222() {
			const data222 = getSingle('222')
			if(data222 === false){
				Logger.log('error', `222 field: does not exist, or multiple fields`);
				return;
			}

			let year = data222.match(/(?:PV)?(\d{4})/);

			if(year === null){
				Logger.log('error', `222 field: no valid year found from '${data222}'`);
				return;
			}

			if(main){
				// Emot
				// 008/07-10 yyyy + 260 ## $c pyyyy. – jos ei kenttää 224
				if(!exists(224)){
					marcRecord.insertField({
						tag: '260',
						ind1: '',
						ind2: '',
						subfields:[{
							code: 'c',
							value: 'p' + year[1]
						}]
					});
				}

				if(!insertToControl008(7, 4, year[1])){
					Logger.log('error', `222 field: failed to insert to control from '${data222}'`);
				}
			}else{
				// Osakohteet
				// 008/07-10 yyyy + 773 $d pyyyy – jos ei kenttää 224
				if(!exists(224)){
					marcRecord.insertField({
						tag: '773',
						ind1: '',
						ind2: '',
						subfields:[{
							code: 'd',
							value: 'p' + year[1]
						}]
					});

					if(!insertToControl008(7, 4, year[1])){
						Logger.log('error', `222 field: failed to insert to control from '${data222}'`);
					}
				}else{
					// jos on 224: 534 ## $p Alun perin julkaistu: $c pyyyy.
					marcRecord.insertField({
						tag: '534',
						ind1: '',
						ind2: '',
						subfields:[{
							code: 'p',
							value: 'Alun perin julkaistu:' + year[1]
						},{
							code: 'c',
							value: 'p' + year[1]
						}]
					});
				}
			}
			console.log(control008)
		}


		function handle223and225() {
			let matches = null;
			//From 225: 008/15-17 ks. ylekoodit
			if(exists(225)){
				const data225 = getSingle('225')
				if(data225 === false){
					Logger.log('info', `225 field: does not exist, or multiple fields`);
					return;
				}

				matches = data225.match(/(?:RM)?(\d{4})/);

			// From 223: 008/15-17 – jos ei kenttää 225 ks. ylekoodit
			}else{
				const data223 = getSingle('223')
				if(data223 === false){
					Logger.log('info', `223 field: does not exist, or multiple fields`);
					return;
				}

				matches = data223.match(/(?:PM)?(\d{4})/);
			}

			if(matches){
				let countryCode = getPubCountry(matches[1]);
				if(!insertToControl008(15, 3, countryCode)){
					let field = '223';
					if(exists(225)){
						field = '225'
					}
					Logger.log('error', `223 field: failed to insert to control from '${field}', transformed to:' ${countryCode}'`);
				}
			}
		}


		function handle224() {	
			const data224 = getSingle('224')
			if(data224 === false){
				Logger.log('info', `224 field: does not exist, or multiple fields`);
				return;
			}

			let matches = data224.match(/(?:RV)?(\d{4})/);
			if(matches){
				let year = matches[1];

				// emot: 008/07-10 yyyy + 264 ## $c pyyyy.
				if(main){
					marcRecord.insertField({
						tag: '264',
						ind1: '',
						ind2: '',
						subfields:[{
							code: 'c',
							value: 'p' + year
						}]
					});

				// osakohteet: 008/07-10 yyyy + 773 $d pyyyy
				}else{
					marcRecord.insertField({
						tag: '773',
						ind1: '',
						ind2: '',
						subfields:[{
							code: 'd',
							value: 'p' + year
						}]
					});
				}
	
				if(!insertToControl008(7, 4, year)){
					Logger.log('error', `224 field: failed to insert to control from '${data224}', transformed to:' ${year}'`);
				}
			}
			console.log(control008)
		}


		// 008/07-10 yyyy + 260 ## $c [yyyy?] – jos ei kenttiä 222 tai 224
		//NV: tätä ei enää käytetä
		// Input: "HV2017"
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
		function handle230() {
			const data230 = getAll('230')
			if(data230 === false){
				Logger.log('info', `230 field: does not exist, or multiple fields`);
				return;
			}

			if(data230.length >= 4){
				Logger.log('warn', `230 field: 4 or more lines, not specced.`);
			}

			// jos 2 riviä -> vain 1., jos 3 riviä -> 1. ja 2. molemmista omat 028-kentät
			if(data230.length === 2 || data230.length === 3){
				data230.pop();
			}

			
			// emot: 028 01 $b levymerkki $a tuotetunnus (lisätieto) - tuotetunnuksesta pois tyhjämerkit
			if(!main){
				console.log("-------- 230 --------")
				console.log("data: ", data230);

				data230.every(function(line) {
					// Ei konvertoida: ”Ei kaupallista tunnusta”, ”Ei tilausnumeroa”
					if(line.match(/(Ei kaupallista tunnusta)|(Ei tilausnumeroa)/)){
						return true;
					}					
					
					let elements = line.split(/\s\/\s/);
					// levymerkki / tuotetunnus
					// levymerkki / tuotetunnus / (lisätieto)

					if(elements.length === 2){
						elements[1] = elements[1].replace(/\s/, '');
						marcRecord.insertField({
							tag: '028',
							ind1: '0',
							ind2: '1',
							subfields:[{
								code: 'b',
								value: elements[0]
							},{
								code: 'a',
								value: elements[1]
							}]
						});
					}else{
						Logger.log('warn', `230 field: insertion failed, not two elements`);
					}

					return true;
				});
			}
		}


		function handle243() {
			if(!main){
				const data243 = getSingle('243')
				if(data243 === false){
					Logger.log('info', `243 field: does not exist, or multiple fields`);
					return;
				}
	
				// vain teokset, 12-merkkinen koodi	024 0# $a, kukin numero uuteen kenttään
				marcRecord.insertField({
					tag: '024',
					ind1: '0',
					ind2: '',
					subfields:[{
						code: 'a',
						value: data243
					}]
				});
			}
		}


		function handle244() {
			const data244 = getAllCombined('244');

			if(data244 === false){
				Logger.log('info', `244 field: does not exist`);
				return;
			}

			// osakohteet:
			// vain 008/24 z, ei 500-kenttää
			if(!insertToControl008(24, 1, 'z')){
				Logger.log('error', `244 field: failed to insert to control from '${data244}'`);
			}

			// emot:
			// 008/24 z + 500 ## $a sellaisenaan
			if(main){
				marcRecord.insertField({
					tag: '500',
					ind1: '',
					ind2: '',
					subfields:[{
						code: 'a',
						value: data244
					}]
				});
			}
		}


		function exists(ind){
			if(fonoMap.has(ind)){
				return true;
			}
			return false;
		}

		function getSingle(ind){
			if(fonoMap.has(ind)){
				let data = fonoMap.get(ind);
				if(data.length === 1){
					return data[0];
				}
			}
			return false;
		}


		function getAll(ind){
			if(fonoMap.has(ind)){
				return fonoMap.get(ind);
			}
			return false;
		}


		function getAllCombined(ind){
			const dataAll = getAll(ind);
			if(dataAll){
				let data = '';
				dataAll.forEach(function(line) {
					if(line.match(/^\s/) || data.match(/\s$/)){
						data = data + line;
					}else{
						data = data + ' '  + line;
					}
				});
				return data;
			}else{
				return dataAll;
			}
		}


		function getGenre(data){
			switch(true){
				//[/^L1A\b/ && do { $mr->insert_fields_ordered(MARC::Field->new('084', '', '', a => '78.35', 2 => 'ykl')], 
				case /^L1B\b/.test(data):
				return 'pt'; 
				case /^L1C\b/.test(data): //$mr->insert_fields_ordered(MARC::Field->new('084', '', '', a => '78.32', 2 => 'ykl')], 
				return 'sg'; 
				case /^L1L\b/.test(data):// 22
				return 'j'; 
			
				case /^L2\b/.test(data):
				case /^L2A\b/.test(data):
				case /^L2B\b/.test(data):
				case /^L2BB\b/.test(data):
				case /^L2L\b/.test(data): //marc_set_pos($m008, 22,  'j'; 
				case /^L2N\b/.test(data):
				return 'gm'; 
			
				case /^L3\b/.test(data):
				case /^L3A\b/.test(data):
				case /^L3L\b/.test(data): //marc_set_pos($m008, 22,  'j'; 
				case /^L3U\b/.test(data):
				case /^L3X\b/.test(data):
				return 'fm'; 

				case /^L4\b/.test(data):
				case /^L4A\b/.test(data):
				case /^L4AA\b/.test(data):
				return 'rc';

				case /^L4L\b/ .test(data): //marc_set_pos($m008, 22,  'j';
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
				case /^L6L\b/.test(data): //marc_set_pos($m008, 22,  'j'; 
				case /^L6V\b/.test(data):
				case /^L6X\b/.test(data):
				return 'pp'; 
			
				case /^L9E\b/.test(data):
				return 'mp';
			}
			Logger.log('warn', `getGenre(): genre code ${data} not identified`);
			return '  ';
		}

		function getPubCountry(input){
			switch(input){
				case '1000': //Suomi
				case '1100': //Uusimaa
				case '1200': //Ahvenanmaa
				case '1300': //Varsinais-Suomi
				case '1400': //Satakunta ja Häme
				case '1410': //Satakunta
				case '1420': //Pirkanmaa
				case '1430': //Etelä-Häme
				case '1440': //Keski-Suomi
				case '1500': //Kymenlaakso
				case '1600': //Savo
				case '1610': //Etelä-Savo
				case '1620': //Pohjois-Savo
				case '1700': //Karjala
				case '1710': //Etelä-Karjala
				case '1720': //Pohjois-Karjala
				case '1800': //Pohjanmaa
				case '1810': //Etelä-Pohjanmaa
				case '1820': //Keski-Pohjanmaa
				case '1830': //Pohjois-Pohjanmaa
				case '1831': //Koillismaa
				case '1840': //Kainuu
				case '1850': //Peräpohjola
				case '1900': //Lappi
				return 'fi';

				//case '2000 => '' //Skandinavia
				case '2100': //Ruotsi
				return 'sw'
				case '2200': //Norja
				return 'no'
				case '2300': //Tanska
				return 'dk'
				case '2380': //Färsaaret
				return 'dk'
				case '2390': //Grönlanti
				return 'dk'
				case '2400': //Islanti
				return 'ic'

				//case: '3000': '' //Eurooppa
				case '3100': //Iso-Britannia ja Irlanti
				case '3110': //Englanti (ja Kanaalin ym. Saaret)
				case '3120': //Wales
				case '3130': //Skotlanti
				case '3140': //Pohjois-Irlanti
				return 'xxk'
				case '3180':
				return 'ie' //Irlanti (tasavalta)
				case '3200':
				return 'gw' //Saksa
				case '3310':
				return 'sz' //Sveitsi
				case '3330':
				return 'au' //Itävalta
				case '3410':
				return 'be' //Belgia
				case '3420':
				return 'ne' //Alankomaat
				case '3430':
				return 'lu' //Luxemburg
				case '3500':
				return 'fr' //Ranska
				case '3590':
				return 'mc' //Monaco
				case '3610':
				return 'sp' //Espanja
				case '3670':
				return 'po' //Portugali
				case '3710':
				return 'it' //Italia
				case '5100':
				return 'ru' //Venäjä
				case '5210':
				return 'er' //Viro
				case '5220':
				return 'lv' //Latvia
				case '5230':
				return 'li' //Liettua
				case '5300':
				return 'bw' //Valkovenäjä
				case '5400':
				return 'un' //Ukraina
				case '5500':
				return 'mv' //Moldova
				case '5600':
				return 'ai' //Armenia
				case '5800':
				return 'gs' //Georgia
				case '7110':
				return 'xxc' //'Kanada
				case '7120':
				return 'xxu' //'Yhdysvallat
				case '7130':
				return 'mx' //Meksiko
			}
		}


		function isOnlineMaterial(input) {
			const onlineCodes = ['0222', '1153', '1156', '1157', '1158', '1159', '1160', '2115', '3141', '7062', '7063']
			if(onlineCodes.contains(input)){
				return true;
			}
			return false;
		}


		//ToDo: move this up, should be before handling
		function generateMap(line){
			let ind = line.substr(0, 3);
			line = line.substr(3);
	
			if(fonoMap.has(ind)){
				let arr = fonoMap.get(ind);
				arr.push(line);
				fonoMap.set(ind, arr)
			}else{
				fonoMap.set(ind, [line])
			}
		}


		function insertToControl008(start, length, data){
			if(typeof(data) !== 'string' || data.length > length){
				return false;
			}
			data.split('').forEach(function(char, ind) {
				control008.push({ind: start+ind, val: char});
			});
			return true;
		}

		
		function handleLeaderDummy() {
			const chars = marcRecord.leader.split('');

			if (chars[6] === 'o' && marcRecord.get(/^655$/).some(isBoardGame)) {
				chars[6] = 'r';
			}

			if (chars[18] === 'c') {
				chars[18] = 'i';
			}

			marcRecord.leader = chars.join('');

			function isBoardGame(field) {
				return field.subfields.some(sf => sf.code === 'a' && sf.value === 'lautapelit');
			}
		}


		function handle008Dummy() {
			const f008 = marcRecord.get(/^008$/).shift();

			if (f008) {
				const creationDate = moment().format('YYMMDD');
				// Convert to array, pad to 41 characters and remove first 6 chars (Creation time) and the erroneous last three chars ('nam')
				const chars = f008.value.split('').slice(0, 40).slice(6);

				if (chars[17] === ' ') {
					chars[17] = '^';
				}

				if (chars[18] === 'c') {
					chars[18] = 'i';
				}

				if (['#', '^', 'd', 'u', '|'].includes(chars[39])) {
					chars[39] = 'c';
				}

				f008.value = `${creationDate}${chars.join('')}`;
			}
		}

	}

	async function inputTestData () {
		let text = await getStream(stream)
		let rec = [];
		rec = text.split(/^\*\*\*+/m); //Find "***" from start of line and split by it
		rec.shift(); //Remove first one as splits first is empty
		return rec;
	}
}

// function streamToString (stream) {
// 	const chunks = []
// 	stream.on('data', chunk => {
// 		console.log("Pushing chunk: ", chunk)
// 		chunks.push(chunk)
// 	})
// 	stream.on('error', () => console.log("error"))
// 	stream.on('close', () => { 
// 		console.log("Chunks: ", chunks)
// 		return Buffer.concat(chunks).toString('utf8') 
// 	})
// }
// stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))