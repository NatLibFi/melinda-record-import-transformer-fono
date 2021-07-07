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
import {isEqual} from 'lodash';

// import {Readable} from 'stream';

const {createLogger} = Utils;
chai.use(sinonChai);

const FIXTURES_PATH = path.join(__dirname, '../test-fixtures/yleRecords/');
const Logger = createLogger();
let first = true; // Temporary solution to limit tests that are run

/* eslint-disable max-nested-callbacks */
describe('transform - from files', () => {
	fs.readdirSync(path.join(FIXTURES_PATH, 'in')).forEach(async file => {
		describe('transform - for file: ' + file, () => {
			if (first === true) {
				first = false;

				// Read input:
				const text = fs.readFileSync(path.join(FIXTURES_PATH, 'in', file), 'utf8');
				const records = text.split(/^\*\*\*+/m).filter(n => n);

				// Read output
				const expectedOutput = JSON.parse(fs.readFileSync(path.join(FIXTURES_PATH, 'out', file.replace(/.txt/, '.json')), 'utf8'));

				records.forEach((record, ind) => {
					if (ind > 3) {
						console.log('Amount of records tested per file limited, breaking');
						return;
					}

					let lines = record.split(/[\r\n]+/).filter(n => n); // Split each line to array. Remove first, seems to be index not used in transformation

					// console.log('******************************');
					// console.log(record);
					// console.log(JSON.stringify(expectedOutput[ind], null, 2));
					// console.log('******************************');

					describe('transform - for record: ' + lines[0], () => {
						lines.shift(); // Remove first (index)
						let marcRecord = new MarcRecord();
						let data = null;
						let data2 = null;
						let fonoMap = new Map([]);

						// record = record.replace(/\r\n$/, ''); // Remove possible extra linebreaks at end of string
						lines.map(generateMapLine);
						testContext.appendMap(fonoMap);
						const main = fonoMap.main() ? 'main:' : 'sub';
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
							const ind = line.substr(0, 3);
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

						function getExpectedFields(tags) {
							return expectedOutput[ind].fields.filter(field => {
								return tags.includes(field.tag);
							});
						}

						// Checks if returned control/leader field structure matches fields from existing (expected) transformations
						function matchStructure(input, expected, context) {
							// console.log('input: ', input);
							// console.log('expected: ', expected);
							// console.log('ind: ', ind);

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
						}

						// Cheks if returned MarcRecords subfields exists in expected transformation
						function matchSubfields(input) {
							// console.log('Input: ', JSON.stringify(input, null, 2));

							if (input === null || typeof (input) !== 'object') {
								return false;
							}

							let ok = true;

							// Go trough each field:
							input.fields.forEach(field => {
								// Find fields to compare by tag
								// console.log('Field: ', field);

								const compFields = getExpectedFields(field.tag);
								if (!compFields.some(expt => {
									// console.log('Some: ', expt);
									// console.log('Eq: ', isEqual(expt, field));
									return isEqual(expt, field);
								})) {
									printNotFoundExpected(field, compFields);
									ok = false;
								}
							});
							return ok;
						}
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

function printNotFoundExpected(field, compField) {
	console.log('---------------------------');
	console.log(`Failed match check in tag ${field.tag} - field not found:`);
	console.log(JSON.stringify(field, null, 2));
	console.log('Expected:');
	console.log(JSON.stringify(compField, null, 2));
	console.log('---------------------------');
}
