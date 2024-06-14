const {
  fs: {writeFile},
  tests: {startPackageServer, getHttpsCertificates, validLogins},
} = require(`pkg-tests-core`);

// TODO: Enable these tests on Windows when we can solve the
// RequestError: unsuitable certificate purpose
// issue
(process.platform === `win32` ? describe.skip : describe)(`Https tests`, () => {
  test(
    `it should fail to install if server uses non trusted certificate`,
    makeTemporaryEnv(
      {
        dependencies: {[`@private/package`]: `1.0.0`},
      },
      async ({path, run}) => {
        const url = await startPackageServer({type: `https`});

        await writeFile(`${path}/.yarnrc.yml`, [
          `npmScopes:`,
          `  private:`,
          `    npmRegistryServer: "${url}"`,
          `    npmAuthToken: ${validLogins.fooUser.npmAuthToken}`,
        ].join(`\n`));

        await expect(run(`install`)).rejects.toThrow(/RequestError: self(-| )signed certificate/);
      },
    ),
  );

  test(
    `it should install when providing valid CA certificate via root httpsCaFilePath`,
    makeTemporaryEnv(
      {
        dependencies: {[`@private/package`]: `1.0.0`},
      },
      async ({path, run, source}) => {
        const url = await startPackageServer({type: `https`});
        const certs = await getHttpsCertificates();

        await writeFile(`${path}/rootCA.crt`, certs.ca.certificate);
        await writeFile(`${path}/.yarnrc.yml`, [
          `httpsCaFilePath: ${path}/rootCA.crt`,
          `npmScopes:`,
          `  private:`,
          `    npmRegistryServer: "${url}"`,
          `    npmAuthToken: ${validLogins.fooUser.npmAuthToken}`,
        ].join(`\n`));

        await run(`install`);

        await expect(source(`require('@private/package')`)).resolves.toMatchObject({
          name: `@private/package`,
          version: `1.0.0`,
        });
      },
    ),
  );

  test(
    `it should install when providing valid CA certificate on wildcard`,
    makeTemporaryEnv(
      {
        dependencies: {[`@private/package`]: `1.0.0`},
      },
      async ({path, run, source}) => {
        const url = await startPackageServer({type: `https`});
        const certs = await getHttpsCertificates();

        await writeFile(`${path}/rootCA.crt`, certs.ca.certificate);
        await writeFile(`${path}/.yarnrc.yml`, [
          `networkSettings:`,
          `  "*":`,
          `    httpsCaFilePath: ${path}/rootCA.crt`,
          `npmScopes:`,
          `  private:`,
          `    npmRegistryServer: "${url}"`,
          `    npmAuthToken: ${validLogins.fooUser.npmAuthToken}`,
        ].join(`\n`));

        await run(`install`);

        await expect(source(`require('@private/package')`)).resolves.toMatchObject({
          name: `@private/package`,
          version: `1.0.0`,
        });
      },
    ),
  );

  test(
    `it should install when providing valid CA certificate on hostname`,
    makeTemporaryEnv(
      {
        dependencies: {[`@private/package`]: `1.0.0`},
      },
      async ({path, run, source}) => {
        const url = await startPackageServer({type: `https`});
        const certs = await getHttpsCertificates();

        await writeFile(`${path}/rootCA.crt`, certs.ca.certificate);
        await writeFile(`${path}/.yarnrc.yml`, [
          `networkSettings:`,
          `  "localhost":`,
          `    httpsCaFilePath: ${path}/rootCA.crt`,
          `npmScopes:`,
          `  private:`,
          `    npmRegistryServer: "${url}"`,
          `    npmAuthToken: ${validLogins.fooUser.npmAuthToken}`,
        ].join(`\n`));

        await run(`install`);

        await expect(source(`require('@private/package')`)).resolves.toMatchObject({
          name: `@private/package`,
          version: `1.0.0`,
        });
      },
    ),
  );

  test(
    `it should fail to install if certificate doesn't match hostname`,
    makeTemporaryEnv(
      {
        dependencies: {[`@private/package`]: `1.0.0`},
      },
      async ({path, run}) => {
        const url = await startPackageServer({type: `https`});
        const certs = await getHttpsCertificates();

        await writeFile(`${path}/rootCA.crt`, certs.ca.certificate);
        await writeFile(`${path}/.yarnrc.yml`, [
          `networkSettings:`,
          `  "foo":`,
          `    httpsCaFilePath: ${path}/rootCA.crt`,
          `npmScopes:`,
          `  private:`,
          `    npmRegistryServer: "${url}"`,
          `    npmAuthToken: ${validLogins.fooUser.npmAuthToken}`,
        ].join(`\n`));

        await expect(run(`install`)).rejects.toThrow(/RequestError: self(-| )signed certificate/);
      },
    ),
  );

  test(
    `it should throw error if CA cert file does not exist`,
    makeTemporaryEnv(
      {
        dependencies: {[`@private/package`]: `1.0.0`},
      },
      async ({path, run}) => {
        const url = await startPackageServer({type: `https`});

        await writeFile(`${path}/.yarnrc.yml`, [
          `httpsCaFilePath: ${path}/missing.crt`,
          `npmScopes:`,
          `  private:`,
          `    npmRegistryServer: "${url}"`,
          `    npmAuthToken: ${validLogins.fooUser.npmAuthToken}`,
        ].join(`\n`));

        await expect(run(`install`)).rejects.toThrow(`ENOENT: no such file or directory`);
      },
    ),
  );

  test(
    `it should allow bypassing ssl certificate errors`,
    makeTemporaryEnv(
      {
        dependencies: {[`@private/package`]: `1.0.0`},
      },
      async ({path, run, source}) => {
        const url = await startPackageServer({type: `https`});

        await writeFile(`${path}/.yarnrc.yml`, [
          `enableStrictSsl: false`,
          `npmScopes:`,
          `  private:`,
          `    npmRegistryServer: "${url}"`,
          `    npmAuthToken: ${validLogins.fooUser.npmAuthToken}`,
        ].join(`\n`));

        await run(`install`);

        await expect(source(`require('@private/package')`)).resolves.toMatchObject({
          name: `@private/package`,
          version: `1.0.0`,
        });
      },
    ),
  );
});
