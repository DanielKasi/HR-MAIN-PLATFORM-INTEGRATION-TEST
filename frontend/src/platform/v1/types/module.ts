import { Reducer, AnyAction } from "@reduxjs/toolkit";

export interface ModuleDescriptor {
	name: string;
	version: string;
	platformVersion: string;
	routeBasePath: string;
	routes: string[];
	slices: Record<string, Reducer<any, AnyAction>>;
	sagas?: Array<() => Generator>;
	rtkApis?: Array<{
		reducerPath: string;
		reducer: any;
		middleware: any;
	}>;
	peerDeps: Record<string, string>;
}

export interface PlatformConfig {
	apiBaseUrl: string;
	locale: string;
	timezone: string;
	environment: "development" | "staging" | "production";
}

export const PLATFORM_VERSION = "1.0.0";
