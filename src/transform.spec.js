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
import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import * as testContext from './transform';

chai.use(sinonChai);

const FIXTURES_PATH = path.join(__dirname, '../test-fixtures/transform');

describe('transform', () => {
	beforeEach(() => {
		// 008 has current date in it
		testContext.default.__Rewire__('moment', sinon.fake.returns({
			format: sinon.fake.returns('000000')
		}));
	});

	afterEach(() => {
		testContext.default.__ResetDependency__('moment');
	});

	fs.readdirSync(path.join(FIXTURES_PATH, 'in')).forEach(file => {
		it(file, async () => {
			const records = await testContext.default(fs.createReadStream(path.join(FIXTURES_PATH, 'in', file), 'utf8'));
			const expectedPath = path.join(FIXTURES_PATH, 'out', file);

			expect(records.map(r => r.toObject())).to.eql(JSON.parse(fs.readFileSync(expectedPath, 'utf8')));
		});
	});
});
