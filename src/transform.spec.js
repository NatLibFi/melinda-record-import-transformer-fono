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

import fs from 'fs';
import path from 'path';
import chai, {expect} from 'chai';
import sinonChai from 'sinon-chai';
import * as testContext from './transform';
import {Utils} from '@natlibfi/melinda-commons';
import {MarcRecord} from '@natlibfi/marc-record';
// import {Readable} from 'stream';

const {createLogger} = Utils;
chai.use(sinonChai);

const FIXTURES_PATH = path.join(__dirname, '../test-fixtures/yleRecords/');
const Logger = createLogger();
let first = true;

/* eslint-disable max-nested-callbacks */
describe('transform - from files', () => {
	fs.readdirSync(path.join(FIXTURES_PATH, 'in')).forEach(async file => {
		describe('transform - for file: ' + file, () => {
			if (first === true) {
				first = false;

				// Read input:
				let text = fs.readFileSync(path.join(FIXTURES_PATH, 'in', file), 'utf8');
				let records = text.split(/^\*\*\*+/m).filter(n => n);

				// Read output
				let expectedOutput = JSON.parse(fs.readFileSync(path.join(FIXTURES_PATH, 'out', file.replace(/.txt/, '.json')), 'utf8'));

				records.forEach((record, ind) => {
					if (ind > 1) {
						console.log('Breaking');
						return;
					}

					let lines = record.split(/[\r\n]+/).filter(n => n); // Split each line to array. Remove first, seems to be index not used in transformation

					describe('transform - for record: ' + lines[0], () => {
						lines.shift(); // Remove first (index)
						let marcRecord = new MarcRecord();
						let data = null;
						let data2 = null;
						let fonoMap = new Map([]);

						// record = record.replace(/\r\n$/, ''); // Remove possible extra linebreaks at end of string
						lines.map(generateMapLine);
						testContext.appendMap(fonoMap);
						let main = fonoMap.main() ? 'main:' : 'sub';
						// console.log('******************************')
						// console.log('Fonomap: ', fonoMap)
						// console.log('Record: ', record)
						// console.log('******************************')

						// eslint-disable-next-line complexity
						// it('General Test', async function () {
						// 	record = '***' + record;
						// 	const s = new Readable();
						// 	s.push(Buffer.from(record, 'utf8'));
						// 	s.push(null);
						// 	let transformed = await testContext.default(s);

						// 	console.log('-------- transformed ----------');
						// 	console.log('leader: ', transformed[0].leader);
						// 	console.log(transformed[0].fields);
						// 	console.log('-------- expectedOutput ----------');
						// 	console.log(expectedOutput[ind]);

						// 	expect(transformed[0].leader).to.eql(expectedOutput[ind].leader);
						// 	expect(transformed[0].fields).to.eql(expectedOutput[ind].fields);
						// });

						// console.log("----- Marc -----")
						// console.log(JSON.stringify(marcRecord, null, 2));

						describe('Specific tests - ' + main, () => {
							beforeEach(() => {
								marcRecord = new MarcRecord();
								data = null;
								data2 = null;
							});

							it('001', done => {
								testContext.handle001(fonoMap, marcRecord, Logger);
								expect(matchSubfields(marcRecord)).to.eql(true);
								done();
							});

							it('002', done => {
								data = []; // leader
								testContext.handle002(fonoMap, Logger, data);
								expect(matchStructure(data, expectedOutput[ind].leader, 'leader')).to.eql(true);
								done();
							});

							it('102&104', done => {
								data = []; // control007
								data2 = []; // control008
								testContext.handle102and104(fonoMap, marcRecord, Logger, data, data2);
								expect(matchStructure(data, getExpectedField('007'), 'control007')).to.eql(true);
								expect(matchStructure(data2, getExpectedField('008'), 'control008')).to.eql(true);
								done();
							});

							it('103', done => {
								testContext.handle103(fonoMap, marcRecord, Logger);
								expect(matchSubfields(marcRecord)).to.eql(true);
								done();
							});

							it('112', done => {
								testContext.handle112(fonoMap, marcRecord, Logger);
								expect(matchSubfields(marcRecord)).to.eql(true);
								done();
							});

							// it('120 - ToDo when transformation done', (done) => {
							// 	testContext.handle120(fonoMap, marcRecord, Logger)
							// 	// console.log('Marc: ', JSON.stringify(marcRecord, null, 2));
							// 	expect(matchSubfields(marcRecord)).to.eql(true);
							// 	done();
							// });

							it('130', done => {
								testContext.handle130(fonoMap, marcRecord, Logger);
								expect(matchSubfields(marcRecord)).to.eql(true);
								done();
							});

							it('140', done => {
								testContext.handle140(fonoMap, marcRecord, Logger);
								expect(matchSubfields(marcRecord)).to.eql(true);
								done();
							});

							it('141', done => {
								testContext.handle141(fonoMap, marcRecord, Logger);
								expect(matchSubfields(marcRecord)).to.eql(true);
								done();
							});

							it('150', done => {
								testContext.handle130(fonoMap, marcRecord, Logger); // F130 generates M245 used in F150
								testContext.handle150and151(fonoMap, marcRecord, Logger);
								expect(matchSubfields(marcRecord)).to.eql(true);
								done();
							});

							it('162', done => {
								testContext.handle162(fonoMap, marcRecord, Logger);
								expect(matchSubfields(marcRecord)).to.eql(true);
								done();
							});

							it('170', done => {
								data = []; // control008
								testContext.handle170(fonoMap, marcRecord, Logger, data);
								expect(matchSubfields(marcRecord)).to.eql(true);
								expect(matchStructure(data, getExpectedField('008'), 'control008')).to.eql(true);
								done();
							});

							it('175', done => {
								testContext.handle175(fonoMap, marcRecord, Logger);
								expect(matchSubfields(marcRecord)).to.eql(true);
								done();
							});

							it('180', done => {
								testContext.handle180(fonoMap, marcRecord, Logger);
								expect(matchSubfields(marcRecord)).to.eql(true);
								done();
							});

							it('190&191', done => {
								testContext.handle190and191(fonoMap, marcRecord, Logger);
								expect(matchSubfields(marcRecord)).to.eql(true);
								done();
							});

							it('200', done => {
								testContext.handle200(fonoMap, marcRecord, Logger);
								expect(matchSubfields(marcRecord)).to.eql(true);
								done();
							});

							it('222', done => {
								data = []; // control008
								testContext.handle222(fonoMap, marcRecord, Logger, data);
								expect(matchSubfields(marcRecord)).to.eql(true);
								expect(matchStructure(data, getExpectedField('008'), 'control008')).to.eql(true);
								done();
							});

							it('223&225', done => {
								data = []; // control008
								testContext.handle223and225(fonoMap, Logger, data);
								expect(matchStructure(data, getExpectedField('008'), 'control008')).to.eql(true);
								done();
							});

							it('224', done => {
								data = []; // control008
								testContext.handle224(fonoMap, marcRecord, Logger, data);
								expect(matchSubfields(marcRecord)).to.eql(true);
								expect(matchStructure(data, getExpectedField('008'), 'control008')).to.eql(true);
								done();
							});

							it('230', done => {
								testContext.handle230(fonoMap, marcRecord, Logger);
								expect(matchSubfields(marcRecord)).to.eql(true);
								done();
							});

							it('243', done => {
								testContext.handle243(fonoMap, marcRecord, Logger);
								expect(matchSubfields(marcRecord)).to.eql(true);
								done();
							});

							it('244', done => {
								data = []; // control008
								testContext.handle244(fonoMap, marcRecord, Logger, data);
								expect(matchSubfields(marcRecord)).to.eql(true);
								expect(matchStructure(data, getExpectedField('008'), 'control008')).to.eql(true);
								done();
							});
						});

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

						function getExpectedField(tag) {
							return expectedOutput[ind].fields.find(field => {
								return field.tag === tag;
							});
						}

						// function getExpectedFields(tags) {
						// 	return expectedOutput[ind].fields.filter(field => {
						// 		return tags.includes(field.tag);
						// 	});
						// }

						// Checks if returned control/leader field structure matches fields from existing (expected) transformations
						let matchStructure = function (input, expected, context) {
							// console.log('input: ', input)
							// console.log('expected: ', expected)

							if (input === null || typeof (input) !== 'object') {
								return false;
							}

							if (typeof (expected) === 'object' && typeof (expected.value) === 'string') {
								expected = expected.value;
							}

							let ok = true;
							input.forEach(e => {
								if (expected[e.ind] !== e.val) {
									printFail(e.val, expected[e.ind], context, e.ind);
									ok = false;
								}
							});

							return ok;
						};

						// Cheks if returned MarcRecords subfields exists in expected transformation
						let matchSubfields = function (input) {
							// console.log('Input: ', JSON.stringify(input, null, 2));

							if (input === null || typeof (input) !== 'object') {
								return false;
							}

							let ok = true;
							// Go trough each field:
							input.fields.forEach(field => {
								let comp = getExpectedField(field.tag);
								// console.log('Compare: ', field)
								// console.log('to: ', comp)

								if (typeof (comp) === 'undefined') {
									printNotFound(field);
									ok = false;
								} else {
									// Go trough each subfield of input
									field.subfields.forEach(sub => {
										// console.log('---------------------------')
										// console.log('Checking: ', sub)
										// console.log('against: ', comp)

										// Check comparison subfield against expected fields subfields
										if (!comp.subfields.some(compSub => {
											// console.log('Some: ', field)
											return compSub.code === sub.code && compSub.value === sub.value;
										})) {
											printNotFoundExpected(sub, comp.subfields, field);
											ok = false;
										}
										// else{
										// 	console.log('Found match')
										// };
									});
								}
							});
							return ok;
						};
					});
				});
			}
		});
	});
});

function printFail(val, expected, context, ind) {
	console.log('---------------------------');
	console.log(`Failed match check: ${val} not expected ${expected} in ${context} index ${ind}`);
	console.log('---------------------------');
}

function printNotFoundExpected(sub, subfields, field) {
	console.log('---------------------------');
	console.log(`Failed match check in tag ${field.tag} - subfield not found:`);
	formatMarcPrint(sub);
	console.log('Expected:');
	subfields.forEach(s => {
		formatMarcPrint(s);
	});
	console.log('---------------------------');
}

function printNotFound(field) {
	console.log('---------------------------');
	console.log(`Failed match check with tag ${field.tag} - tag not found:`);
	field.subfields.forEach(s => {
		formatMarcPrint(s);
	});
	console.log('---------------------------');
}

function formatMarcPrint(subfield) {
	console.log(subfield.code + ': ' + subfield.value);
}

// //Check subfield against expected fields subfields
// if(!comp.some(rec => {
// 	console.log('Rec: ', rec)
// 	return field.tag === rec.tag && rec.subfields.some(field => {
// 		console.log('Some: ', field)
// 		return field.code === rec.code && field.value === rec.value;
// 	})
// })){
// 	console.log(`Failed match check: ${JSON.stringify(sub, null, 2)} not found from expected ${JSON.stringify(expected.subfields, null, 2)} in ${context}`);
// 	ok = false;
// }else{
// 	console.log('Found match')
// };

// input.fields.find(field => {
// 	return field.tag === tag;
// }).subfields.forEach(function(e){
// 	console.log('---------------------------')
// 	console.log('Checking for: ', e, ', ')
// 	// console.log('Find: ', expected.subfields.some(field => {
// 	// 	return field.code === e.code && field.value === e.value;
// 	// }));

// 	if(!expected.some(rec => {
// 		console.log('Rec: ', rec)
// 		return field.tag === rec.tag && rec.subfields.some(field => {
// 			console.log('Some: ', field)
// 			return field.code === e.code && field.value === e.value;
// 		})
// 	})){
// 		console.log(`Failed match check: ${JSON.stringify(e, null, 2)} not found from expected ${JSON.stringify(expected.subfields, null, 2)} in ${context}`);
// 		ok = false;
// 	};
// })

// const config = [
// 	{
// 		fieldNums: ['112', '120'],
// 		resFields: ['518'] //NV: nykykoodissa tämä on poikasen ensisijainen julkaisuvuosipaikka (008/07-10 ja 264$c [yyyy]), vrt. 222
// 	}/*,{

// 	}*/
// ]

// async function checkEachField(file){
// 	config.forEach(async function(fieldConfig){
// 		if(!(fieldConfig.fieldNums && fieldConfig.resFields)){
// 			Logger.log('error', `invalid config field ${fieldConfig}`);
// 		}

// 		let records = await filterRecords(fs.createReadStream(path.join(FIXTURES_PATH, 'in', file), 'utf8'), fieldConfig.fieldNums); //['002', '190']
// 		const s = new Readable();
// 		s.push(Buffer.from(records, 'utf8'));
// 		s.push(null);
// 		let transformed = await testContext.default(s);
// 		console.log('Transformed: ', JSON.stringify(transformed, null, 2))
// 		const outPath = path.join(FIXTURES_PATH, 'out', file.replace(/.txt/, '.json'));
// 		const expected = await filterResults(JSON.parse(fs.readFileSync(outPath, 'utf8')), fieldConfig.resFields);
// 		console.log('Expected: ', JSON.stringify(expected, null, 2));
// 		expect(transformed).to.eql(expected);
// 	})
// }

// async function filterResults(records, fieldNums){
// 	let res = [];
// 	records.forEach(function(rec){
// 		let resObj = {leader: '', fields: []};
// 		rec.fields.forEach(function(field){
// 			if(typeof(field.tag) === 'undefined' || fieldNums.some(e => field.tag === e)){
// 				resObj.fields.push(field)
// 			}
// 		})
// 		res.push(resObj);
// 	})
// 	return res;
// }

// async function filterRecords(stream, fieldNums){
// 	let text = await getStream(stream);
// 	let reg = new RegExp('(\\r\\n(?!(' + fieldNums.join('|') + ')|\\*\\*\\*).+?(?=\\r\\n|$))', 'g'); //Remove unneeded fields for test
// 	text = text.replace(reg, '' );
// 	return text;
// }

// before((done)=> {
// 	console.log('Before')
// 	setTimeout(function(){
// 		console.log('Timeout')
// 	}, 500);
// 	let first = true;
// 	fs.readdirSync(path.join(FIXTURES_PATH, 'in')).forEach(async (file) => {
// 		if(first === true){
// 			first = false;
// 			let text = await getStream(fs.createReadStream(path.join(FIXTURES_PATH, 'in', file), 'utf8'));
// 			records = text.split(/^\*\*\*+/m).filter(n => n)
// 			console.log('Records: ', records)
// 			done();
// 		}
// 	});
// 	// it(file, async () => {
// 	// 	await checkEachField(file);
// 	// });
// });

// beforeEach(() => {
// 	// 008 has current date in it
// 	// testContext.default.__Rewire__('moment', sinon.fake.returns({
// 	// 	format: sinon.fake.returns('c')
// 	// }));
// });

// afterEach(() => {
// 	// testContext.default.__ResetDependency__('moment');
// });

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
