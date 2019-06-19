const defaultClientEnvRegexp = /^CLIENT_/;

function getClientEnv(env, envKeys, regexp = defaultClientEnvRegexp) {
    const envCache = Object.assign({}, env);
    const envKeysSet = envKeys.reduce((acc, envKey) => {
        acc[envKey] = true;

        return acc;
    }, {});

    return Object.keys(envCache).reduce((acc, envKey) => {
        if (envKeysSet[envKey] && !acc[envKey]) {
            acc[envKey] = envCache[envKey];

            return acc;
        }

        if (regexp.test(envKey)) {
            const key = envKey.replace(regexp, '');

            acc[key] = envCache[envKey];
        }

        return acc;
    }, {});
}

function getEnvScript(env, { variable, envKeys }, regexp = defaultClientEnvRegexp) {
    const clientEnv = getClientEnv(env, envKeys, regexp);

    return `window.${variable} = ${JSON.stringify(clientEnv)};`;
}

function getEnvScriptTag(env, config, regexp = defaultClientEnvRegexp) {
    return `<script>${getEnvScript(env, config, regexp)}</script>`;
}

module.exports = {
    getClientEnv,
    getEnvScript,
    getEnvScriptTag
};
