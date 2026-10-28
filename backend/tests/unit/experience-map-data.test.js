import { afterEach, expect, jest, test } from '@jest/globals';

jest.mock('../../server/services/Scheduler.service.js', () => ({
    __esModule: true,
    syncExperienceSchedule: jest.fn(),
    populateScheduleBounded: jest.fn(),
    previewStartDateUpdate: jest.fn(),
    confirmStartDateUpdate: jest.fn(),
}));

import Experience from '../../server/models/Experience.model.js';
import cache from '../../server/utils/cache.js';
import { getNearbyExperiences } from '../../server/controllers/Experience.controller.js';

const makeResponse = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

afterEach(() => jest.restoreAllMocks());

test('nearby experience discovery includes public location coordinates for map pins', async () => {
    const coordinates = { type: 'Point', coordinates: [-105.2364, 20.6085] };
    jest.spyOn(cache, 'get').mockResolvedValue(null);
    jest.spyOn(cache, 'set').mockResolvedValue(true);
    const findAll = jest.spyOn(Experience, 'findAll').mockResolvedValue([{
        toJSON: () => ({
            id: 7,
            title: 'Old Town Taco Tour',
            ratings: '5.00',
            thumbnail: null,
            images: [],
            detailsMetadata: {},
            TicketTiers: [{ title: 'Adult', price: '32.99' }],
            Location: { name: 'Old Town Taco Route', city: 'Puerto Vallarta', coordinates },
        }),
    }]);
    const res = makeResponse();

    await getNearbyExperiences({ query: {} }, res);

    expect(findAll).toHaveBeenCalledWith(expect.objectContaining({
        include: expect.arrayContaining([
            expect.objectContaining({
                attributes: ['city', 'name', 'coordinates'],
            }),
        ]),
    }));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: {
            elements: [expect.objectContaining({
                title: 'Old Town Taco Tour',
                price: '32.99',
                ratings: '5.00',
                Location: expect.objectContaining({ coordinates }),
            })],
        },
    }));
});
