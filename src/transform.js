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
	const records = await JSON.parse(await getStream(stream));

	Logger.log('debug', `Starting conversion of ${records.length} records...`);
	return Promise.all(records.map(convertRecord));

	function convertRecord(record) {
		const marcRecord = convertToMARC();

		/* Order is significant! */
		handleLeader();
		handle008();

		marcRecord.insertField({tag: 'SID', subfields: [
			{code: 'a', value: record.id},
			{code: 'b', value: 'helme'}
		]});

		return marcRecord;

		function convertToMARC() {
			const marcRecord = new MarcRecord();

			record.varFields
				.forEach(field => {
					if (field.content) {
						if (field.fieldTag === '_') {
							marcRecord.leader = field.content;
						} else {
							marcRecord.insertField({tag: field.marcTag, value: field.content});
						}
					} else if (field.subfields) {
						marcRecord.insertField({
							tag: field.marcTag,
							ind1: field.ind1,
							ind2: field.ind2,
							subfields: field.subfields.map(subfield => {
								if ('content' in subfield && subfield.content.length === 0) {
									return {code: subfield.tag};
								}

								return {
									code: subfield.tag,
									value: subfield.content
								};
							})
						});
					}
				});

			return marcRecord;
		}

		function handleLeader() {
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

		function handle008() {
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
}
