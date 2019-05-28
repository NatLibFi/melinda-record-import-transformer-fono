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

import fs from 'fs';
import path from 'path';
import getStream from 'get-stream';
import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import * as testContext from './transform';
import {Readable} from 'stream';
import {Utils} from '@natlibfi/melinda-commons';

const {createLogger} = Utils;
chai.use(sinonChai);

const FIXTURES_PATH = path.join(__dirname, '../test-fixtures/yleRecords/');



describe('transform', () => {
	beforeEach(() => {
		// 008 has current date in it
		// testContext.default.__Rewire__('moment', sinon.fake.returns({
		// 	format: sinon.fake.returns('c')
		// }));
	});

	afterEach(() => {
		// testContext.default.__ResetDependency__('moment');
	});

	let first = true;
	fs.readdirSync(path.join(FIXTURES_PATH, 'in')).forEach(file => {
		if(first === true){
			first = false;
			it(file, async () => {
				await checkEachField(file);
			});
		}
	});
});
const config = [
	{
		fieldNums: ['112', '120'],
		resFields: ['518'] //NV: nykykoodissa tämä on poikasen ensisijainen julkaisuvuosipaikka (008/07-10 ja 264$c [yyyy]), vrt. 222
	}/*,{

	}*/
]

async function checkEachField(file){
	config.forEach(async function(fieldConfig){
		if(!(fieldConfig.fieldNums && fieldConfig.resFields)){
			Logger.log('error', `invalid config field ${fieldConfig}`);
		}

		let records = await filterRecords(fs.createReadStream(path.join(FIXTURES_PATH, 'in', file), 'utf8'), fieldConfig.fieldNums); //['002', '190']
		const s = new Readable();
		s.push(Buffer.from(records, 'utf8'));
		s.push(null);
		let transformed = await testContext.default(s);
		console.log("Transformed: ", JSON.stringify(transformed, null, 2))
		const outPath = path.join(FIXTURES_PATH, 'out', file.replace(/.txt/, '.json'));
		const expected = filterResults(JSON.parse(fs.readFileSync(outPath, 'utf8')), fieldConfig.resFields);
		console.log("Expected: ", JSON.stringify(expected, null, 2));
		//expect(records.map(r => r.toObject())).to.eql(JSON.parse(fs.readFileSync(outPath, 'utf8')));
	})
}

async function filterResults(records, fieldNums){
	// console.log(JSON.stringify(records, null, 2));
	console.log("Records length: ", records.length)
	console.log("Fieldnums: ", fieldNums);

	let res = [];

	//ToDo: filter object to contain only searched fields (in fieldNums )
	console.log("------------ forEach filtering -----------")
	records.forEach(function(rec){
		let resObj = {leader: "", fields: []};
		rec.fields.forEach(function(field){
			if(typeof(field.tag) === 'undefined' || fieldNums.some(e => field.tag === e)){
				console.log("****************")
				console.log("Field: ", field, " matched")
				resObj.fields.push(field)
			}
		})

		console.log("Res:")
		console.log(res);

		// let res = rec.filter(field => fieldNums.some(function(e){
		// 	e === field;
		// }))
		console.log("---------------------")
	})
	console.log("Res: ", res);
}

async function filterRecords(stream, fieldNums){
	let text = await getStream(stream);
	let reg = new RegExp('(\\r\\n(?!(' + fieldNums.join('|') + ')|\\*\\*\\*).+?(?=\\r\\n|$))', 'g'); //Remove unneeded fields for test
	text = text.replace(reg, '' );
	return text;
}


// Test data:

// Äänitteet (main)
// 140Beethoven, Ludwig van [1770-1827] (säv).
// 140Hille, Sid [1961- ] (säv).

// Teokset
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

// 162SV1932
// 162SV1902 valm
// 162SV1684 julk
// 162SV1743 noin
// 162SV2016 ensi
// 162SV1900 uud
// 162SV1903 ork
// 162SV2016 sov
// 62SV1500-luku

//-----------------------------------

// 244Tekstilehtinen.
// 244Esittelylehtinen englanniksi ja saksaksi.
// 244Esittelylehtinen.

// 244Esittelylehtinen englanniksi, ranskaksi, saksaksi ja hollanniksi.
// 244Libretto saksaksi, englanniksi ja ranskaksi.  SACD.

//-----------------------------------

// 243FIUNP8000502
// 243GBVEV1700240
// 243FIKHY1700040
// 243FIMF61700004
// 243GBMZL1700002
// 243FIZEN1700009
// 243ISRC FIPEB17
// 243FI-M6A-17-00
// 243NOEIT1501020
