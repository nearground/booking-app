import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);



const cp = require('cron-parser');
const { CronExpressionParser } = cp;
const debug = require('debug')('app:test-cron');

const options = {
    currentDate: new Date(),
    endDate: new Date(Date.now() + 1000 * 60 * 10),
    iterator: true, // test this option
};
try {
    const interval = CronExpressionParser.parse('*/2 * * * *', options);
    debug('Is interval iterable? %s', typeof interval[Symbol.iterator] === 'function');
    debug('Does interval have next()? %s', typeof interval.next === 'function');
    debug('First next: %s', interval.next().toString());
} catch (e) {
    debug('Error parsing with iterator: true %O', e);
}

