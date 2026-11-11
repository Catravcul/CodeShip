import { mode } from "./variables";

const development = {
	codeshipApi: {
		urlBase: "http://127.0.0.1:5000",
	},
	codeshipNet: {
		urlBase: "http://127.0.0.1:3000",
	},
	codeshipFS: {
		urlBase: "http://127.0.0.1:5000",
	},
};
const test = {
	codeshipApi: {
		urlBase: "http://127.0.0.1:5000",
	},
	codeshipNet: {
		urlBase: "http://127.0.0.1:3000",
	},
	codeshipFS: {
		urlBase: "http://127.0.0.1:5000",
	},
};
const production = {
	codeshipApi: {
		urlBase: "https://codeship-api.2.ie-1.fl0.io",
	},
	codeshipNet: {
		urlBase: "https://codeship-net.netlify.app",
	},
	codeshipFS: {
		urlBase: "https://codeship-fs.netlify.app",
	},
};

export function getConfig() {
	switch (mode) {
		case "DEV":
			return development;
		case "TEST":
			return test;
		default:
			return production;
	}
}
