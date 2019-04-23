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

/* eslint-disable new-cap */
import validateFactory from '@natlibfi/marc-record-validate';
import {
	FieldExclusion,
	FieldStructure,
	FieldsPresent,
	EmptyFields,
	EndingPunctuation,
	IsbnIssn,
	SubfieldExclusion
} from '@natlibfi/marc-record-validators-melinda';

export default async () => {
	return validateFactory([
		await FieldsPresent([/^(336|337|338)$/]),
		await FieldExclusion([
			/^(001|091|092|093|094|095|256|533|574|575|576|577|578|599)$/,
			{tag: /^264$/, subfields: [{code: /^a$/, value: /^\[.*\]$/}]},
			{tag: /^650$/, subfields: [{code: /^a$/, value: /^overdrive$/i}]},
			{tag: /^041$/, dependencies: [{leader: /^.{6}[g|i]/}]}
		]),
		await EmptyFields(),
		await IsbnIssn({hyphenateISBN: true}),
		await SubfieldExclusion([
			{tag: /^041$/, subfields: [{code: /a|d/, value: /^zxx$/}]}
		]),
		await FieldStructure([
			{tag: /^007$/, dependencies: [{leader: /^.{6}[^at]/}]}
		]),
		await EndingPunctuation()
	]);
};
