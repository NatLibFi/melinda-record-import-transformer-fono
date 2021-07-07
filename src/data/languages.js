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

// https://marc21.kansalliskirjasto.fi/kielet_nimet.htm

export const LANGUAGES_FINNISH = new Map([
	['afrikaans ', 'afr'],
	['albania', 'alb'],
	['arabia', 'ara'],
	['armenia', 'arm'],
	// ['EN', 'eng'],
	// ['ENG', 'eng'],
	['englanti', 'eng'],
	['espanja', 'spa'],
	['gaeli', 'gla'], // 2017Q3: Yle koodannut iirin pieleen
	['georgia', 'geo'],
	['heprea', 'heb'],
	['hindi', 'hin'],
	['iiri', 'gle'],
	['islanti', 'ice'],
	// ['IT', 'ita'],
	['italia', 'ita'],
	['japani', 'jpn'],
	['karjala', 'krl'],
	['kiina', 'chi'],
	['kirkkoslaavi', 'chu'],
	['kreikka', 'gre'],
	['kroatia', 'hrv'],
	// ['LAT', 'lat'],
	['latina', 'lat'],
	['liettua', 'lit'],
	['nenetsi', 'fiu'], // Yleiskoodi suom.-ugr.
	['norja', 'nor'],
	['puola', 'pol'],
	['portugali', 'por'],
	['ranska', 'fre'],
	['romanikieli', 'rom'],
	// ['RU', 'swe'],
	['ruotsi', 'swe'],
	['saame', 'smi'],
	// ['SA', 'ger'],
	// ['SAK', 'ger'],
	['saksa', 'ger'],
	['sanaton', 'zxx'],
	['sechuana', 'tsn'], // Tswana
	['serbia', 'srp'],
	['sloveeni', 'slv'],
	// ['SU', 'fin'],
	['suahili', 'swa'],
	['suomi', 'fin'],
	['tanska', 'dan'],
	['tshekki', 'cze'], // Ces
	['tunnistamaton', '   '], // Und
	['turkki', 'tur'],
	['unkari', 'hun'],
	['valekieli', 'zxx'],
	// ['VEN', 'rus'],
	['venäjä', 'rus'],
	['viro', 'est'],
	['wolof', 'wol']
]);

// Export const LANGUAGES_FINNISH = [
// 	{key: 'afrikaans ' , value: 'afr'},
// 	{key: 'albania', value: 'alb'},
// 	{key: 'arabia', value: 'ara'},
// 	{key: 'armenia', value: 'arm'},
// 	// {key: 'EN', value: 'eng'},
// 	// {key: 'ENG', value: 'eng'},
// 	{key: 'englanti', value: 'eng'},
// 	{key: 'espanja', value: 'spa'},
// 	{key: 'gaeli', value: 'gla'}, // 2017Q3: Yle koodannut iirin pieleen
// 	{key: 'georgia', value: 'geo'},
// 	{key: 'heprea', value: 'heb'},
// 	{key: 'hindi', value: 'hin'},
// 	{key: 'iiri', value: 'gle'},
// 	{key: 'islanti', value: 'ice'},
// 	// {key: 'IT', value: 'ita'},
// 	{key: 'italia', value: 'ita'},
// 	{key: 'japani', value: 'jpn'},
// 	{key: 'karjala', value: 'krl'},
// 	{key: 'kiina', value: 'chi'},
// 	{key: 'kirkkoslaavi', value: 'chu'},
// 	{key: 'kreikka', value: 'gre'},
// 	{key: 'kroatia', value: 'hrv'},
// 	// {key: 'LAT', value: 'lat'},
// 	{key: 'latina', value: 'lat'},
// 	{key: 'liettua', value: 'lit'},
// 	{key: 'nenetsi', value: 'fiu'}, // yleiskoodi suom.-ugr.
// 	{key: 'norja', value: 'nor'},
// 	{key: 'puola', value: 'pol'},
// 	{key: 'portugali', value: 'por'},
// 	{key: 'ranska', value: 'fre'},
// 	{key: 'romanikieli', value: 'rom'},
// 	// {key: 'RU', value: 'swe'},
// 	{key: 'ruotsi', value: 'swe'},
// 	{key: 'saame', value: 'smi'},
// 	// {key: 'SA', value: 'ger'},
// 	// {key: 'SAK', value: 'ger'},
// 	{key: 'saksa', value: 'ger'},
// 	{key: 'sanaton', value: 'zxx'},
// 	{key: 'sechuana', value: 'tsn'}, // Tswana
// 	{key: 'serbia', value: 'srp'},
// 	{key: 'sloveeni', value: 'slv'},
// 	// {key: 'SU', value: 'fin'},
// 	{key: 'suahili', value: 'swa'},
// 	{key: 'suomi', value: 'fin'},
// 	{key: 'tanska', value: 'dan'},
// 	{key: 'tshekki', value: 'cze'}, // ces
// 	{key: 'tunnistamaton', value: '   '}, // und
// 	{key: 'turkki', value: 'tur'},
// 	{key: 'unkari', value: 'hun'},
// 	{key: 'valekieli', value: 'zxx'},
// 	// {key: 'VEN', value: 'rus'},
// 	{key: 'venäjä', value: 'rus'},
// 	{key: 'viro', value: 'est'},
// 	{key: 'wolof', value: 'wol'}
// ]
