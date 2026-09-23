import { parsePassages } from './parse';
import r1 from './r1';
import r2 from './r2';
import r3 from './r3';
import r4 from './r4';

export const PASSAGES = [r1, r2, r3, r4].flatMap(parsePassages);
