"use client";

import { Component, ReactNode } from "react";

interface Props {
	children: ReactNode;
	moduleName: string;
}

interface State {
	hasError: boolean;
	error?: Error;
}

export class ModuleErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: any) {
		console.error(`[${this.props.moduleName}] Error:`, error, errorInfo);
		// Send to monitoring service
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className="p-8 border border-red-200 rounded-lg">
					<h2 className="text-xl font-semibold text-red-600 mb-2">
						Module Error: {this.props.moduleName}
					</h2>
					<p className="text-gray-600">
						{this.state.error?.message || "An unexpected error occurred"}
					</p>
				</div>
			);
		}

		return this.props.children;
	}
}
