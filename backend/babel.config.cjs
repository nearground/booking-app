module.exports = {
  presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
  plugins: [
    // Transform import.meta.url → __filename so createRequire(import.meta.url)
    // works in Jest's CJS context without triggering a TDZ conflict.
    () => ({
      visitor: {
        MemberExpression(path) {
          const { node } = path;
          if (
            node.object.type === 'MetaProperty' &&
            node.object.meta.name === 'import' &&
            node.object.property.name === 'meta' &&
            node.property.type === 'Identifier' &&
            node.property.name === 'url'
          ) {
            path.replaceWithSourceString('module.filename');
          }
        },
      },
    }),
  ],
};
