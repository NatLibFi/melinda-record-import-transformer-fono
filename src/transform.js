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
		var marcRecord = new MarcRecord();
		var fonoMap = new Map([]);

		var lines = record.split(/[\r\n]+/);
		lines.shift(); //Remove first, seems to be index not used in transformation

		lines.map(generateMap);

		console.log(fonoMap)

		handleLeader();
		handle001();
		handle002(); //This checks records type (main/sub) and sets boolean main
		handle102();
		handle103();
		handle104();
		handle112();
		handle120();
		handle130();
		handle140();
		handle141();
		handle150();
		handle151();
		handle162();
		handle170();
		handle175();
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

		return marcRecord;

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

		// 306 ## $a hhmmss (esim. 000500, 023112)
		// ToDo: input "+45S-012412             KTV2016 TM1000             L4" does not match example
		function handle001() {
			//marcRecord.insertField(field);

		}


		// 1 -> 000/06-07 jm, 2 -> 000/06-07 ja
		// ToDo: input "201704051PV2017" does not match example
		function handle002() {
			let main = false;

		}


		// Jos lähdekentän 104 arvo:
		// CD
		// emot: 035 ## $a v81xxxxxx
		// osakohteet: 773 ## $w v81xxxxxx
		// 33rpm.
		// emot: 035 ## $a v95xxxxxx
		// osakohteet: 773 ## $w v95xxxxxx
		// 45rpm.
		// emot: 035 ## $a v96xxxxxx
		// osakohteet: 773 ## $w v96xxxxxx
		// Nauha
		// emot: 035 ## $a v80xxxxxx
		// osakohteet: 773 ## $w v80xxxxxx
		// 78
		// emot: 035 ## $a v97xxxxxx
		// osakohteet: 773 ## $w v97xxxxxx
		// Audiofile
		// emot: 035 ## $a v98xxxxxx
		// osakohteet: 773 ## $w v98xxxxxx
		// Huomaa, että Voyageriin viedessä viennin jälkeen on ajettu fono_relink.perl, joka korvaa emojen 035$a:n ja 
		// poikastaen 773$w tietokannan oikealla id:llä. Jos v98* tai v81*, niin myös tämä arvo on jätetty emon 
		// 035$a-kenttään. (v98 jätetään saapumisvalvonnan ja v81 jonkun mahdollisen Mikkelin digitointiseurantatarpeen takia.)

		// Input: "012412"
		function handle102() {
			if(main){
				let tag = '035'
			}else{
				let tag = '773'
			}
			// CD
			// emot: 035 ## $a v81xxxxxx
			// osakohteet: 773 ## $w v81xxxxxx

			// 33rpm.
			// emot: 035 ## $a v95xxxxxx
			// osakohteet: 773 ## $w v95xxxxxx

			// 45rpm.
			// emot: 035 ## $a v96xxxxxx
			// osakohteet: 773 ## $w v96xxxxxx
			
			// Nauha
			// emot: 035 ## $a v80xxxxxx
			// osakohteet: 773 ## $w v80xxxxxx
			
			// 78
			// emot: 035 ## $a v97xxxxxx
			// osakohteet: 773 ## $w v97xxxxxx
			
			// Audiofile
			// emot: 035 ## $a v98xxxxxx
			// osakohteet: 773 ## $w v98xxxxxx
		}


		// ToDo: Ei esimerkkitietueessa
		function handle103() {

		}
			

		// Ks. kentän 102 konversio!
		// CD
		// 007/00 s, 007/01/ d, 007/03 f, 007/06 g, 007/10 m + emoon 300 ## $a 1 CD-äänilevy.
		// 33rpm
		// 007/00 s, 007/01 d, 007/03 b, 007/06 e, 007/10 p + emoon 300 ## $a 1 äänilevy.
		// 45rpm
		// 007/00 s, 007/01 d, 007/03 c, 007/06 c, 007/10 p + emoon 300 ## $a 1 äänilevy : $b 45 kierr./min.
		// Nauha
		// 007/00 s, 007/01 s, 007/03 l, 007/06 j, 007/10 p + emoon 300 $a 1 C-kasetti.
		// 78
		// 007/00 s, 007/01 d, 007/03 d, 007/06 d, 007/10 | + emoon 300 ## $a 1 äänilevy : $b 78 kierr./min.

		// Input: "45rpm"
		function handle104() {

		}


		// Emot
		// eka rivi 245 00 $a pienaakkosilla – ks. Artikkeleiden ohitus
		// lisätään aina 245 $a-kentän jälkeen $h [Äänite]
		// Toinen ja seuraavat rivit 245 osakenttään $b, osakenttää $b edeltää tyhjämerkki,
		// kaksoispiste, tyhjämerkki ( : )
		// jos rivien sisältö on (kokoelma), (kokonaisjulkaisu), (hittikokoelma) -> ei konvertoida
		// jos tekstiä ”A-puoli”, ”B-puoli” -> 505 0# $a sellaisenaan
		// jos tekstiä ”Omistus”, ”Tässä” -> 500 ## $a sellaisenaan
		
		// Osakohteet
		// 773 $t – vain eka rivi pienaakkosilla

		// Input: "QUEEN OF HELL"
		function handle130() {

		}


		// ToDo: Ei esimerkkitietueessa
		function handle140() {

		}


		// ToDo: Ei esimerkkitietueessa
		function handle141() {

		}

		
		// ToDo: Ei esimerkkitietueessa
		function handle150() {

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

		function generateMap(line){
			var ind = line.substr(0, 3);
			line = line.substr(3);
	
			if(fonoMap.has(ind)){
				var arr = fonoMap.get(ind);
				arr.push(line);
				fonoMap.set(ind, arr)
			}else{
				fonoMap.set(ind, [line])
			}
		}
	}

	async function inputTestData () {
		let text = await getStream(stream)
		var rec = [];
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