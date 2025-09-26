import { IInterviewStage, IInterviewStageFormData, IPaginatedResponse } from "@/types/types.utils";
import apiRequest from "../apiRequest";

export const INTERVIEW_STAGES_API = {
	getPaginatedInterviewStages: async (params: {
		institutionId: number;
		search?: string;
		page?: number;
		ordering?: string;
	}) => {
		const urlParams = new URLSearchParams();
		Object.entries(params).forEach(([key, value]) => {
			if (value && key !== "institutionId") {
				urlParams.append(key, value.toString());
			}
		});
		const response = await apiRequest.get(
			`recruitment/institution/${params.institutionId}/interview-stage/?${urlParams.toString()}`,
		);
		return response.data as IPaginatedResponse<IInterviewStage>;
	},

	getPaginatedStagesFromUrl: async ({ url }: { url: string }) => {
		const response = await apiRequest.get(url);
		return response.data as IPaginatedResponse<IInterviewStage>;
	},

	create: async ({
		institutionId,
		stageData,
	}: {
		institutionId: number;
		stageData: IInterviewStageFormData;
	}): Promise<IInterviewStage | null> => {
		const formData = new FormData();

		formData.append("name", stageData.name);
		formData.append("level", stageData.level.toString());
		formData.append("job_position_advert", stageData.job_position_advert.toString());

		stageData.interviewers.forEach((interviewerId) => {
			formData.append("interviewers", interviewerId.toString());
		});

		if (stageData.feedback_fields && stageData.feedback_fields.length > 0) {
			formData.append("feedback_fields", JSON.stringify(stageData.feedback_fields));
		}

		const response = await apiRequest.post(
			`recruitment/institution/${institutionId}/interview-stage/`,
			formData,
		);

		return response.data as IInterviewStage;
	},

	update: async ({
		stageId,
		stageData,
	}: {
		stageId: number;
		stageData: IInterviewStageFormData;
	}): Promise<IInterviewStage | null> => {
		const formData = new FormData();

		formData.append("name", stageData.name);
		formData.append("level", stageData.level.toString());
		formData.append("job_position_advert", stageData.job_position_advert.toString());

		stageData.interviewers.forEach((interviewerId) => {
			formData.append("interviewers", interviewerId.toString());
		});

		if (stageData.feedback_fields && stageData.feedback_fields.length > 0) {
			formData.append("feedback_fields", JSON.stringify(stageData.feedback_fields));
		}

		const response = await apiRequest.patch(`recruitment/interview-stage/${stageId}/`, formData);

		return response.data as IInterviewStage;
	},

	delete: async ({ stageId }: { stageId: number }) => {
		const response = await apiRequest.delete(`recruitment/interview-stage/${stageId}/`);
		return response;
	},
};
