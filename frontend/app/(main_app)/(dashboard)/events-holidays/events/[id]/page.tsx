"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Calendar, Users, Globe, MapPin, Building } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { calendarAPI, showErrorToast } from "@/lib/utils";
import type { IEvent } from "@/types/types.utils";
import ApprovableInstancePageLayout from "@/components/common/layouts/approvable-instance-layout";

const EventDetailPage = () => {
    const [event, setEvent] = useState<IEvent | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const params = useParams();
    const eventId = params?.id as string;

    const fetchEventDetail = async () => {
        if (!eventId) return;

        try {
            setLoading(true);
            const numericId = Number(eventId);

            if (isNaN(numericId)) {
                throw new Error("Invalid event ID format");
            }

            const eventData = await calendarAPI.getEvent(numericId);
            setEvent(eventData);

        } catch (error) {
            showErrorToast({
                error: error,
                defaultMessage: "Failed to fetch event details.",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEventDetail();
    }, [eventId]);

    const getEventModeIcon = (mode: string) => {
        switch (mode) {
            case "physical":
                return <MapPin className="h-4 w-4 text-blue-600" />;
            case "online":
                return <Globe className="h-4 w-4 text-purple-600" />;
            case "hybrid":
                return <Building className="h-4 w-4 text-orange-600" />;
            default:
                return <Calendar className="h-4 w-4 text-gray-600" />;
        }
    };

    const getEventModeBadge = (mode: string) => {
        switch (mode) {
            case "physical":
                return "bg-blue-100 text-blue-800 border-blue-200";
            case "online":
                return "bg-purple-100 text-purple-800 border-purple-200";
            case "hybrid":
                return "bg-orange-100 text-orange-800 border-orange-200";
            default:
                return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    if (loading) {
        return (
            <div className="space-y-6 p-6 bg-white">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-8"></div>
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="h-64 bg-gray-200 rounded"></div>
                        <div className="h-64 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="space-y-6 p-6 bg-white">
                <div className="text-center py-12">
                    <h2 className="text-lg font-semibold text-gray-900">Event not found</h2>
                    <p className="text-gray-600 mt-2">The event you're looking for doesn't exist.</p>
                    <Button onClick={() => router.back()} className="mt-4">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Go Back
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6 bg-white">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 rounded-full aspect-square flex-shrink-0"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                    </Button>
                    <div className="mt-4">
                        <h1 className="text-2xl font-semibold tracking-tight">{event.title}</h1>
                        <p className="text-muted-foreground">Event Details</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    {getEventModeIcon(event.event_mode)}
                    <Badge className={`${getEventModeBadge(event.event_mode)} border`}>
                        {event.event_mode.charAt(0).toUpperCase() + event.event_mode.slice(1)}
                    </Badge>
                </div>
            </div>

            <ApprovableInstancePageLayout instance={event} onInstanceRefresh={fetchEventDetail}>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Calendar className="mr-2 h-5 w-5" />
                            Event Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex justify-between">
                                <span className="text-sm font-medium text-gray-700">Title:</span>
                                <span className="text-sm font-semibold">{event.title}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm font-medium text-gray-700">Date:</span>
                                <span className="text-sm">{formatDate(event.date)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm font-medium text-gray-700">Event Mode:</span>
                                <div className="flex items-center gap-2">
                                    {getEventModeIcon(event.event_mode)}
                                    <span className="text-sm capitalize">{event.event_mode}</span>
                                </div>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm font-medium text-gray-700">Target Audience:</span>
                                <span className="text-sm capitalize">{event.target_audience.replace('_', ' ')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm font-medium text-gray-700">Institution ID:</span>
                                <span className="text-sm">#{event.institution}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm font-medium text-gray-700">Event ID:</span>
                                <span className="text-sm">#{event.id}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm font-medium text-gray-700">Created:</span>
                                <span className="text-sm">{formatDate(event.created_at)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm font-medium text-gray-700">Updated:</span>
                                <span className="text-sm">{formatDate(event.updated_at)}</span>
                            </div>
                        </div>

                        {event.description && (
                            <div className="mt-4 pt-4 border-t">
                                <span className="text-sm font-medium text-gray-700">Description:</span>
                                <p className="text-sm text-gray-700 mt-2 leading-relaxed bg-gray-50 p-3 rounded-md">
                                    {event.description}
                                </p>
                            </div>
                        )}

                        {event.department && (
                            <div className="mt-4 pt-4 border-t">
                                <span className="text-sm font-medium text-gray-700">Department:</span>
                                <span className="text-sm ml-2">{event.department}</span>
                            </div>
                        )}

                        {event.specific_employees && event.specific_employees.length > 0 && (
                            <div className="mt-4 pt-4 border-t">
                                <span className="text-sm font-medium text-gray-700">Specific Employees:</span>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {event.specific_employees.map((employee, index) => (
                                        <Badge key={index} variant="outline" className="text-xs">
                                            {employee}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </ApprovableInstancePageLayout>
        </div>
    );
};

export default EventDetailPage;
