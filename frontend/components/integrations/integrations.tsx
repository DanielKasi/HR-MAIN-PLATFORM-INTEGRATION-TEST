"use client";

import React, { useState } from "react";
import { Icon } from "@iconify/react";
import { MeetingsIntegrations } from "./meetings/meetings-integrations";
import { EmailsIntegrations } from "./emails/emails-integrations";

const subTabs = [
	{
		id: "meetings",
		label: "Meetings",
		icon: "hugeicons:computer-video-call",
		description: "Configure video conferencing integrations",
	},
	// {
	// 	id: "documents",
	// 	label: "Documents",
	// 	icon: "hugeicons:document-05",
	// 	description: "Configure document collaboration tools",
	// },
	{
		id: "emails",
		label: "Emails",
		icon: "hugeicons:mail-02",
		description: "Configure email service integrations",
	},
];

export const Integrations: React.FC = () => {
	const [activeSubTab, setActiveSubTab] = useState<"meetings" | "documents" | "emails">("meetings");

	const renderMeetings = () => <MeetingsIntegrations />;
	const renderDocuments = () => (
		<div className="text-center py-8 text-muted-foreground">
			<p>Documents integration coming soon</p>
		</div>
	);
	const renderEmails = () => <EmailsIntegrations />;

	const renderContent = () => {
		switch (activeSubTab) {
			case "meetings":
				return renderMeetings();
			case "documents":
				return renderDocuments();
			case "emails":
				return renderEmails();
			default:
				return renderMeetings();
		}
	};

	return (
		<div className="space-y-6">
			{/* Top Sub-navigation Tabs */}
			<div className="bg-white border-b border-gray-200">
				<div className="flex space-x-4 overflow-x-auto px-4 md:px-6 py-2">
					{subTabs.map((tab) => (
						<button
							key={tab.id}
							onClick={() => setActiveSubTab(tab.id as any)}
							className={`pb-4 text-xs md:text-sm font-medium transition-colors relative whitespace-nowrap flex-shrink-0 flex items-center space-x-2 ${
								activeSubTab === tab.id
									? "text-gray-800 font-semibold"
									: "text-[#848496] hover:text-gray-800"
							}`}
						>
							<Icon
								icon={tab.icon}
								className={`w-5 h-5 ${activeSubTab === tab.id ? "text-primary" : "text-gray-500"}`}
							/>
							<span>{tab.label}</span>
							{activeSubTab === tab.id && (
								<div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#162032] rounded-full" />
							)}
						</button>
					))}
				</div>
			</div>

			{/* Content Panel */}
			<div className="p-4 md:p-6">{renderContent()}</div>
		</div>
	);
};
