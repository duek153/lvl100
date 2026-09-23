import { parseQuestions } from './parse';
import sc from './sentence-completion';
import cm from './closest-meaning';
import rs from './restatements';
import type { Question } from '../../domain/types';

export const SENTENCE_COMPLETION = parseQuestions(sc, 'sc', 'sentence_completion', 'vocabulary');
export const CLOSEST_MEANING = parseQuestions(cm, 'cm', 'closest_meaning', 'vocabulary');
export const RESTATEMENTS = parseQuestions(rs, 'rs', 'restatement', 'restatement');

export const VOCAB_QUESTIONS: Question[] = [...SENTENCE_COMPLETION, ...CLOSEST_MEANING, ...RESTATEMENTS];
