declare module "eventsource" {
	interface EventSourceInit {
		headers?: { [key: string]: string };
	}

	export default class EventSource {
		constructor(url: string, eventSourceInitDict?: EventSourceInit);
		onmessage: ((event: MessageEvent) => void) | null;
		onerror: ((event: Event) => void) | null;
		close: () => void;
		readyState: number;
	}
}
