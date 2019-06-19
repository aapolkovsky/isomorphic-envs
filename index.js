function getClientEnv(env, envKeys) {
    return envKeys.reduce((acc, envKey) => {
        acc[envKey] = env[envKey];

        return acc;
    }, {});
}

function getEnvScript(env, { variable, envKeys }) {
    const clientEnv = getClientEnv(env, envKeys);

    return `window.${variable} = ${JSON.stringify(clientEnv)};`;
}

function getEnvScriptTag(env, config) {
    return `<script>${getEnvScript(env, config)}</script>`;
}

module.exports = {
    getClientEnv,
    getEnvScript,
    getEnvScriptTag
};
