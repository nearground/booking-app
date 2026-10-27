const fs = require('node:fs');
const path = require('node:path');

const backendRoot = path.resolve(__dirname, '..');
const specPath = path.resolve(backendRoot, '..', 'docs', 'reference', 'contracts', 'api', 'openapi.yaml');
const routeSources = {
  users: { file: 'users.js', prefix: '/api/users' },
  organizers: { file: 'organizers.js', prefix: '/api/organizers' },
  experiences: { file: 'experiences.js', prefix: '/api/experiences' },
  cart: { file: 'cart.js', prefix: '/api/cart' },
  orders: { file: 'orders.js', prefix: '/api/orders' },
  comments: { file: 'comments.js', prefix: '/api/comments' },
  media: { file: 'media.js', prefix: '/api/media' },
};

const expectedOperations = [
  ['users', 'put', '/register'], ['users', 'post', '/login'],
  ['users', 'post', '/email-verification/request'], ['users', 'post', '/email-verification/confirm'],
  ['organizers', 'post', '/onboarding/start'], ['organizers', 'post', '/onboarding/complete'],
  ['organizers', 'get', '/invites/resolve'], ['organizers', 'post', '/invites'],
  ['organizers', 'post', '/invites/:id/resend'], ['organizers', 'delete', '/invites/:id'],
  ['experiences', 'get', '/'], ['experiences', 'get', '/verticalFilters'],
  ['experiences', 'get', '/availableCities'], ['experiences', 'get', '/nearbyExperiences'],
  ['experiences', 'get', '/:experienceCode/schedule/calendar'], ['experiences', 'get', '/:experienceCode/schedule'],
  ['experiences', 'post', '/:experienceCode/reservations'], ['experiences', 'get', '/:experienceCode/booking/enquiry'],
  ['experiences', 'get', '/:experienceCode'], ['experiences', 'post', '/manage'],
  ['experiences', 'get', '/manage/:experienceId'], ['experiences', 'patch', '/manage/:experienceId'],
  ['experiences', 'delete', '/manage/:experienceId'], ['experiences', 'patch', '/manage/:experienceId/assign-organizers'],
  ['experiences', 'post', '/manage/:experienceId/sync-schedule'],
  ['experiences', 'post', '/manage/:experienceId/schedule/preview-populate'],
  ['experiences', 'post', '/manage/:experienceId/schedule/populate'],
  ['experiences', 'post', '/manage/:experienceId/schedule/preview-start-date'],
  ['experiences', 'post', '/manage/:experienceId/schedule/update-start-date'],
  ['experiences', 'patch', '/manage/:experienceId/auto-sync'],
  ['experiences', 'patch', '/manage/:experienceId/lookahead'],
  ['experiences', 'patch', '/manage/scheduled-experiences/:sessionId/sync-lock'],
  ['cart', 'get', '/'], ['cart', 'post', '/items'], ['cart', 'patch', '/items/:id'],
  ['cart', 'delete', '/items/:id'], ['cart', 'delete', '/'], ['cart', 'post', '/checkout'],
  ['orders', 'get', '/'], ['orders', 'post', '/guest-receipt'],
  ['orders', 'get', '/:orderNumber/confirmation'], ['orders', 'get', '/:orderNumber'],
  ['comments', 'get', '/received/:commentableType/:commentableId'],
  ['comments', 'get', '/sent/:userId'], ['comments', 'get', '/parent/:parentId/replies'],
  ['comments', 'get', '/eligibility'], ['comments', 'post', '/:commentableType/:commentableId'],
  ['comments', 'put', '/:id'], ['comments', 'delete', '/:id'],
  ['media', 'put', '/upload'], ['media', 'get', '/object/*'],
];

const normalizePath = value => value.length > 1 ? value.replace(/\/$/, '') : value;
const toOpenApiPath = value => value.replace(/\/(\*)$/, '/{objectKey}').replace(/:([^/]+)/g, '{$1}');
const routeKey = (method, route) => `${method.toLowerCase()} ${normalizePath(toOpenApiPath(route))}`;

const parseRouter = ({ file, prefix }) => {
  const source = fs.readFileSync(path.join(backendRoot, 'server', 'routes', file), 'utf8');
  const found = new Set();
  const registration = /router\.(get|post|put|patch|delete)\(\s*(['"])([^'"]+)\2/g;
  for (const match of source.matchAll(registration)) {
    found.add(routeKey(match[1], `${prefix}${match[3]}`));
  }
  return found;
};

describe('OpenAPI target route contract', () => {
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8').replace(/^\uFEFF/, ''));
  const registeredByGroup = Object.fromEntries(
     Object.entries(routeSources).map(([group, source]) => [group, parseRouter(source)])
  );
  const documented = new Set();
  Object.entries(spec.paths).forEach(([route, methods]) => {
    Object.keys(methods).filter(method => ['get', 'post', 'put', 'patch', 'delete'].includes(method))
      .forEach(method => documented.add(routeKey(method, route)));
  });
  const expected = new Set(expectedOperations.map(([group, method, route]) => {
    const { prefix } = routeSources[group];
    return routeKey(method, `${prefix}${route}`);
  }));

  test('specifies only the target operations and every target operation is registered in Express', () => {
    expect([...documented].sort()).toEqual([...expected].sort());
    const missingFromRouter = expectedOperations.filter(([group, method, route]) => {
       const { prefix } = routeSources[group];
       return !registeredByGroup[group].has(routeKey(method, `${prefix}${route}`));
    });
    expect(missingFromRouter).toEqual([]);
  });

  test('selected router prefixes match their mounts in the Express app source', () => {
    const source = fs.readFileSync(path.join(backendRoot, 'server', 'app.js'), 'utf8');
    const mounts = new Map(
       [...source.matchAll(/app\.use\(\s*(['"])([^'"]+)\1\s*,\s*(\w+)\s*\)/g)]
          .map(match => [match[3], match[2]])
    );
    Object.entries(routeSources).forEach(([group, { prefix }]) => {
       expect(mounts.get(`${group}Router`)).toBe(prefix);
    });
  });

  test('records guest checkout and receipt capability boundaries explicitly', () => {
    expect(spec.paths['/api/cart/checkout'].post.security).toEqual([
       { cartSession: [] }, { cookieAuth: [] },
    ]);
    const receipt = spec.paths['/api/orders/guest-receipt'].post;
    const schema = receipt.requestBody.content['application/json'].schema;
    expect(schema.required).toEqual(['orderNumber', 'receiptToken']);
    expect(schema.properties.receiptToken.writeOnly).toBe(true);
    expect(spec.components.schemas.CartItemRequest.properties.ProductType.enum).toEqual(['Experience']);
  });
});
