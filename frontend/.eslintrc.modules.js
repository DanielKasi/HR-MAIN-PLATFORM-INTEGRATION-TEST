module.exports = {
	rules: {
		"import/no-restricted-paths": [
			"error",
			{
				zones: [
					{
						target: "./src/app/**/*",
						from: "./app/**/*",
						message: "Module core (src/app) cannot import standalone shell (app)",
					},
					{
						target: "./src/app/**/*",
						from: "./src/platform-integration/**/*",
						message: "Module app cannot import platform integration",
					},
				],
			},
		],
		"no-restricted-imports": [
			"error",
			{
				patterns: [
					{
						group: ["@/lib/*", "!@/platform/**"],
						message: "Modules must use @/platform API, not direct @/lib imports",
					},
				],
			},
		],
	},
};
