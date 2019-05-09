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

	Logger.log('debug', `Starting conversion of ${records.length} records...`);
	return Promise.all(records.map(convertRecord));

	function convertRecord(record) {
		let marcRecord = new MarcRecord();
		let fonoMap = new Map([]);
		let main = null;
		let leader000 = [];
		let leader007 = [];

		record = record.replace(/\r\n$/, '') //Remove possible extra linebreaks at end of string
		let lines = record.split(/[\r\n]+/); //Split each line to array
		lines.shift(); //Remove first, seems to be index not used in transformation
		lines.map(generateMap);

		console.log("--------- fonoMap -----------")
		console.log(fonoMap)

		handleLeader();
		// handle001(); //Ok
		// handle002(); //Seems to originate from index 8 of input (9th char) //This checks records type (main/sub) and sets boolean main
		// handle102and104(); //ToDo: Voyager clause not checked //This dictates how 102 is handled
		// //handle103(); //ToDo: Yle data inconsistent with spec
		// handle112(); //Ok
		// handle120(); //ToDo: How data is supposed to be parsed from input?
		// handle130(); //Ok
		handle140();
		// handle141(); //Ok
		// handle150(); //ToDo: inconsistency with 505 and 245
		// handle151();
		// handle162();
		// handle170();
		// handle175();
		handle180();
		handle190();
		handle191();
		handle200();
		handle222();
		handle223();
		handle224();
		handle225();
		handle228();
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
			const data001 = singleExists('001')
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
			const data002 = singleExists('002')
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
		function handle102and104() {
			const data102 = singleExists('102')
			const data104 = singleExists('104')
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

					// 007/00 s, 007/01/ d, 007/03 f, 007/06 g, 007/10 m
					leader007.push({ind: 0, val: 's'}, {ind: 1, val: 'd'}, {ind: 3, val: 'f'}, {ind: 6, val: 'g'}, {ind: 10, val: 'm'});

					// emoon 300 ## $a 1 CD-äänilevy.
					marcRecord.insertField({
						tag: '300',
						ind1: '',
						ind2: '',
						subfields:[{
							code: 'a',
							value: '1 CD-äänilevy'
						}]
					});

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

					// 007/00 s, 007/01 d, 007/03 b, 007/06 e, 007/10 p
					leader007.push({ind: 0, val: 's'}, {ind: 1, val: 'd'}, {ind: 3, val: 'b'}, {ind: 6, val: 'e'}, {ind: 10, val: 'p'});

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

					// 007/00 s, 007/01 d, 007/03 c, 007/06 c, 007/10 p
					leader007.push({ind: 0, val: 's'}, {ind: 1, val: 'd'}, {ind: 3, val: 'c'}, {ind: 6, val: 'c'}, {ind: 10, val: 'p'});

					// emoon 300 ## $a 1 äänilevy : $b 45 kierr./min.
					marcRecord.insertField({
						tag: '300',
						ind1: '',
						ind2: '',
						subfields:[{
							code: 'a',
							value: '1 CD-äänilevy'
						},{
							code: 'b',
							value: '45 kierr./min.'
						}]
					});

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

					// 007/00 s, 007/01 s, 007/03 l, 007/06 j, 007/10 p + 
					leader007.push({ind: 0, val: 's'}, {ind: 1, val: 's'}, {ind: 3, val: 'l'}, {ind: 6, val: 'j'}, {ind: 10, val: 'p'});

					// emoon 300 $a 1 C-kasetti.
					if(main){
						marcRecord.insertField({
							tag: '300',
							ind1: '',
							ind2: '',
							subfields:[{
								code: 'a',
								value: 'C-kasetti.'
							}]
						});
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

					// 007/00 s, 007/01 d, 007/03 d, 007/06 d, 007/10
					leader007.push({ind: 0, val: 's'}, {ind: 1, val: 'd'}, {ind: 3, val: 'd'}, {ind: 6, val: 'd'}, {ind: 10, val: '|'});

					// emoon 300 ## $a 1 äänilevy : $b 78 kierr./min.
					if(main){
						marcRecord.insertField({
							tag: '300',
							ind1: '',
							ind2: '',
							subfields:[{
								code: 'a',
								value: '1 äänilevy'
							},{
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

					// 104
					// ToDo: missing config for 007 leader and marc field
					return;
				}
			}
		}


		// ToDo: input does not match specs
		// Input: 'A01'
		function handle103() {
			if(main){
				return;
			}

			const data103 = singleExists('103')
			if(data103 === false){
				Logger.log('error', `103 field: does not exist, or multiple fields`);
				return;
			}

			console.log("main: ", main)

			// 1. Remove leading zeroes with regex as it is needed in any case
			let reg = /(0*)([1-9])/g //This seems to be working with capture groups

			console.log("------ regex tests ------")
			console.log('A01 -> ', 'A01'.replace(reg, '$2'))
			console.log('A01-A02 -> ', 'A01-A02'.replace(reg, '$2'))
			console.log('02-03 -> ', '02-03'.replace(reg, '$2'))
			console.log('01-10 -> ', '01-10'.replace(reg, '$2'))
			console.log('001-10 -> ', '001-10'.replace(reg, '$2'))
			console.log('0002-0003 -> ', '0002-0003'.replace(reg, '$2'))
			console.log("-------------------------")	

			console.log(data103, '', data103.replace(reg, '$2'))
			let data = data103.replace(reg, '$2')
			console.log(data)

			console.log("-------------------------")
			let value = 'R';
			// let regif = /\w\d/g;
			// console.log('Regif: ', data.match(regif))	
			data = '1:3-1:4'
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


		function handle112() {
			const data112 = singleExists('112')
			const data120 = singleExists('120')
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
			const data120 = singleExists('120')
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
					console.log("!!! Line match")
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
					console.log("!!! Line match")

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

		

		// NVOLK: nykyään nuo aukikirjoitetaan: säv. → säveltäjä jne (loppupisteen olemassaolo riippuu kontekstista)
		// NVOLK: Huom. Fono ei kerro, onko kysessä ihminen vai yhteisötekijä (eli suomeksi tässä kontekstissa käytännössä aina yhtye). Jos nimi löytyy Violan tekijäauktoriteettitietueista, niin silloin käytetään sen mukaista tulkintaa. Muuten valistunut arvaus. (Esim. "the" tai yksisananinen tekijä indikoi yleensä yhtyettä,)
		// NVOLK: Fonon nimiä (ja elinvuosia) verrataan Violan tekijäauktoriteettitietuiden nimiin ja salanimiin/taiteilijanimiin. Tarvittaessa Fonosta tuleva nimi vaihdetaan Violaan auktoriteettitietueen 1X0-kentän nimeen. (Esim. jos Fonon nimi löytyy vain auktoriteettitietueen 400-kentässä, niin saatetaankin käyttää auktoriteettitietueen 100-kentässä olevaa nimeä luotavassa tietueessa.)
		// NVOLK: Lisäksi noihin luotaviin tietueisiin on takautuvassa ajossa lisätty tekijöille elinvuodet. Tän varmaan voi toteuttaa Melindassa jotenkin fiksummin.
		// Kentästä voidaan saada myös Musiikin esityskokoonpano -tietoa kenttään 500, ja jotain Kansansävelmä-tietoa kenttään 381.
		function handle140() {
			const data001 = singleExists('001') //Used to search L1
			const data170 = singleExists('170') //Used to search L1
			const data140 = getAll('140')
			if(data140 === false){
				Logger.log('info', `140 field: does not exist`);
				return;
			}

			let data = '';
			data140.forEach(function(line) {
				data = data + line;
			});

			console.log('---------------------------------------')
			// * henkilönnimistä pois syntymä- ja kuolinvuodet, esim. Mancini, Henry [1924-1994] (säv) -> 700 1# $a Mancini, Henry, $e säveltäjä.
			data = data.replace(/(\[[\d\-\s]*\])/g, '');
			// * nimen jälkeinen /pseud/ pois
			data = data.replace(/(\/pseud\s\/)/g, '')
			let lines = data.split(/\./).filter(n => n); //Split each person to array

			let sortedSubfields = [];
			lines.forEach(function(line, ind){
				// * molemmissa Nimeämätön ja Anonyymi jätetään pois
				if(line.match(/(nimeämätön)|(anonyymi)/i)){
					return;
				}

				let sublines = line.split(/(\([^\=].*\))/).filter(n => n);
				sublines[0] = sublines[0].replace(/(^\s+)|(\s+$)/g, '') //Remove whitespaces from start and end

				if(sublines.length > 2){
					Logger.log('error', `140 field: ppl has more than two components: ${sublines}`);
				}


				// * jos ei suluissa olevaa funktiomerkintöä, osakenttä $e jää pois ja osakentän $a pilkku (,) muutetaan pisteeksi (.)
				//console.log("Has comma: ", sublines[0].match(/^[^\(]+\,[^\(]+/))
				console.log("---------")
				let comma = sublines[0].match(/^[^\(]+\,[^\(]+/);
				console.log(ind, sublines, " has comma: ", comma === null);


				// Äänitteet (main)
				// 140Beethoven, Ludwig van [1770-1827] (säv).
				// 140Hille, Sid [1961- ] (säv).
				if(main){
					console.log("Main")
					// jos Fonon 001/170:ssa L1 (=taidemusiikki), ensimmäinen nimi ->
					// 100 1# $a nnn, nnn, $e säv.
					if(ind === 0 && (data001.match(/L1/g) || data170.match(/L1/g))){
						console.log("First with L1")
						marcRecord.insertField({
							tag: '100',
							ind1: '1',
							ind2: '',
							subfields: [{
								code: 'a',
								value: sublines[0] + ','
							},{
								code: 'e',
								value: 'säv.'
							}]
						});
						return;
					}

					// muulloin kaikki nimet näin:
					// 700 1# $a nnn, nnn, $e [funktio] (jos nimessä pilkku)
					if(comma){
						console.log("Otherwise with comma")
						marcRecord.insertField({
							tag: '700',
							ind1: '1',
							ind2: '',
							subfields: [{
								code: 'a',
								value: sublines[0] + ','
							},{
								code: 'e',
								value: sublines[1]
							}]
						});
						return;
					
					// 710 2# $a nnn, $e [funktio] (jos nimessä ei pilkkua)
					}else{
						console.log("Otherwise without comma")
						marcRecord.insertField({
							tag: '710',
							ind1: '1',
							ind2: '',
							subfields: [{
								code: 'a',
								value: sublines[0] + ','
							},{
								code: 'e',
								value: sublines[1]
							}]
						});
						return;
					}

				// Teokset
				// Osakohteet
				// 140Mäkelä, Maiju (säv, san).  LuoMuKanteleet (sov).
				// 140Tolvanen, Alisa (säv).  Tolvanen, Lotta (säv).  LuoMuKanteleet (sov).
				// 140Holly, Buddy [1936-1959].  Petty, Norman [1927-1984].

				// 140Hartikainen, Nuutti (säv).  Tolvanen, Saara (säv).  LuoMuKanteleet
				// 140(sov).

				// 140Kansansävelmä /1.  Kansanlaulu, Suomi /2-3.  Raskinen, Minna (sov
				// 140/1).  LuoMuKanteleet (sov /2-3).

				// 140Malkavaara, Jarmo (säv, san /Raamattu: Psalmi 42 ja 130 mukaan).
				// 140Bergholm, Mikael [1966- ] (sov).

				// 140Solovjov-Sedoi, Vasili [1907-1979] (säv).  Matusovski, Mihail
				// 140[1915-1990] (alkup san).  Puranen, Tuomo (sov).  Kristiina /pseud /
				// 140(= Solanterä, Kyllikki) (san).

				// 140Kansanlaulu /1,3.  Irvine, Andy (säv, san /2).  Rig ma roll (sov /1).
				// 140Jaskari, Jaakko (sov /3).  Kyrö, Jaakko (sov /3).
				}else{
					console.log("Sub")
					if(ind === 0){
						console.log("First")
						if(comma){
							console.log("With comma")
							// 100 1# $a nnn, nnn, $e säv. (1. nimi, jos nimessä pilkku)
							marcRecord.insertField({
								tag: '100',
								ind1: '1',
								ind2: '',
								subfields: [{
									code: 'a',
									value: sublines[0] + ','
								},{
									code: 'e',
									value: 'säv.'
								}]
							});
						}else{
							console.log("Without comma")
							// 110 2# $a nnn, $e säv. (1. nimi, jos nimessä ei pilkkua)
							marcRecord.insertField({
								tag: '110',
								ind1: '2',
								ind2: '',
								subfields: [{
									code: 'a',
									value: sublines[0] + ','
								},{
									code: 'e',
									value: 'säv.'
								}]
							});
						}

						if(sublines.length > 2){
							console.log(sublines[1])

							sublines.splice(1,1)
						}else{
							console.log("No more functions to process in first.")
							return;
						}
					}

					console.log("Rest")
					console.log(sublines)
					
					if(sublines.length > 1){
						let person = sublines.shift();

						lines.forEach(function(func){
							if(comma){
								// 700 1# $a nnn, nnn, $e [funktio] (1. nimen muut funktiot + muut nimet, jos pilkku)
								console.log("Handle rest of functions: ", sublines[1])
	
	
							}else{
		
								// 710 2# $a nnn, $e [funktio] (1. nimen muut funktiot + muut nimet, jos ei pilkkua)
								console.log("Handle rest of functions: ", sublines[1])
							}
						});
					}


					// * 700-kentät järjestykseen -> säv, san, sov, esitt (low priority)
					function sortArr(){
						//order [säv, san, sov, esitt]

						var orderArr = [/säv/i, /san/i, /sov/i, /esitt/i];
						if(sublines.length > 1){
							console.log("Index in order array: ", orderArr, " is: ", orderArr.findIndex(a => sublines[1].match(a)));
						}

						if (sublines.length > 1) {
							var indexInserted = orderArr.findIndex(a => sublines[1].match(a))
							var indexPos = 0;
	
							sortedSubfields.forEach(element => {
								if (orderArr.findIndex(a => sublines[1].match(element)) <= indexInserted) {
									indexPos++;
								}
							});
	
							foundRec.subfields.splice(indexPos, 0, {
								code: 'a',
								value: element
							});
						} else {
							foundRec.subfields.push({
								code: conf.marcSub,
								value: valueFixing(conf, field)
							});
						}
					}
					
				}
			})
			console.log("--------------------")
			console.log("Insert sorted subfields: ", sortedSubfields);
		}


		function handle141() {
			const data141 = getAll('141')
			if(data141 === false){
				Logger.log('info', `Invalid 141 field: does not exist`);
				return;
			}

			// 500 ## $a etutekstillä: Tekijähuomautus:
			data141.forEach(function(line) {
				marcRecord.insertField({
					tag: '500',
					ind1: '',
					ind2: '',
					subfields:[{
						code: 'a',
						value: 'Tekijähuomautus: ' + line
					}]
				});
			});
		}


		// Osakohteet
		// 505 0# $a Xxxx ; Xxxx ; Xxxx ; Xxxx.
		// Fonossa piste ja kaksi tyhjämerkkiä erottaa eri teokset -> korvataan Violassa
		// tyhjämerkki puolipiste tyhjämerkki –yhdistelmällä

		// Emot
		// ensimmäinen rivi -> 245 10 $a – ks. Artikkeleiden ohitus
		// lisätään aina 245 $a-kentän jälkeen $h [Äänite]
		// muut rivit: jos sulkeet ja lopussa viiva (-) -> 031 ## $t, sulkeet ja loppuviiva pois

		// jos sulkeet ja yhtäläisyysmerkki (=) -> = 245 $b, sulkeet ja = pois
		// jos sulkeet ilman = ja - -> 500 ## $a, sulkeet pois, iso alkukirjain

		// tark. taidemusiikin moniriviset nimekkeet! esim.:
		// ensimmäinen 150-rivi 245 $a, muut kaksoispisteen jälkeen kenttään 245 $b.
		// 1501, 1502 jne. kenttään
		// 505 0# $a Osat: 15001-rivin teksti ; 15002-rivin teksti ; 15003-rivin teksti ; 15004-rivin teksti.

		// ToDo: inconsistency with 505 and 245
		function handle150() {
			let data150 = getAll('150')
			if(data150 === false){
				Logger.log('info', `Invalid 150 field: does not exist`);
				return;
			}

			if(main){


			}else{
				
			}

			//Emot:
			//150Moorland elegies, sarja sekakuorolle ja jousiorkesterille.

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
			data150.forEach(function(line) {
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
			});

		}


		// Emot
		// 505 0_ $a xxxx ; xxxx ; xxxx.
		// Fonossa piste ja kaksi tyhjämerkkiä erottaa eri teokset -> korvataan Violassa
		// tyhjämerkki puolipiste tyhjämerkki –yhdistelmällä
		// jos kenttä on jo muodostettu 150-kentästä, tämä sen jatkoksi – harvinaista

		// Osakohteet
		// 500 ## $a sellaisenaan

		// Input: "Queen of hell.  665.  Foes to fire.  Rise of the deth."
		function handle151() {

		}


		// ToDo: Ei esimerkkitietueessa
		function handle162() {

		}


		//084 ## $a nnn $2 ykl ja/tai 008/18-19 Ks. lajikoodit_korjattu.txt

		// Input: "L4 L4A"
		function handle170() {

		}


		// ToDo: Ei esimerkkitietueessa
		function handle175() {

		}
		

		// ToDo: Ei esimerkkitietueessa
		function handle180() {

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
		function handle190() {

		}

		// samalla tavalla kuin kenttä 190 – jos 511 on jo tehty Fonon 190:stä, tämä samaan kenttään jatkoksi
		// POIS kokonaan jos sisältää sanan joka alkaa ”yleistietodoku-”

		// Input: "syntetisaattori)."
		function handle191() {

		}


		// 008/35-37 + 041 ## $d ks. ylekoodit
		// Input: "englanti"
		function handle200() {

		}

	
		// Emot
		// 008/07-10 yyyy + 260 ## $c pyyyy. – jos ei kenttää 224
		
		// Osakohteet
		// 008/07-10 yyyy + 773 $d pyyyy – jos ei kenttää 224
		// jos on 224: 534 ## $p Alun perin julkaistu: $c pyyyy.

		// Input: "PV2017"
		function handle222() {

		}


		// 008/15-17 – jos ei kenttää 225 ks. ylekoodit

		// Input: "PM1000"
		function handle223() {

		}


		// ToDo: Ei esimerkkitietueessa
		function handle224() {

		}


		// ToDo: Ei esimerkkitietueessa
		function handle225() {

		}


		// 008/07-10 yyyy + 260 ## $c [yyyy?] – jos ei kenttiä 222 tai 224
		// Input: "HV2017"
		function handle228() {

		}


		// jos 2 riviä -> vain 1., jos 3 riviä -> 1. ja 2. molemmista omat 028-kentät
		// emot: 028 01 $b levymerkki $a tuotetunnus (lisätieto) - tuotetunnuksesta pois tyhjämerkit
		// Ei konvertoida: ”Ei kaupallista tunnusta”, ”Ei tilausnumeroa”
		// Input: "KRYPT112"
		function handle230() {

		}


		// ToDo: Ei esimerkkitietueessa
		function handle243() {

		}

			
		// emot:
		// 008/24 z + 500 ## $a sellaisenaan

		// osakohteet:
		// vain 008/24 z, ei 500-kenttää

		// Input: "Tekstilehtinen."
		function handle244() {

		}


		function singleExists(ind){
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