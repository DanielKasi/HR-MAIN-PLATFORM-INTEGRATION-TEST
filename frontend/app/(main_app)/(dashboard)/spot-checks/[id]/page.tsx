"use client"

import React, {useEffect, useState} from "react";
import {useRouter, usePathname, useParams} from "next/navigation";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {toast} from "sonner";
import { employeeAPI, showErrorToast, spotcheckAPI } from "@/lib/utils";
import { clearRedirect } from "@/store/redirects/actions";
import { useDispatch } from "react-redux";
import { ISpotCheck } from "@/types/types.utils";
import { SpotcheckExpiredModal } from "@/components/spotcheck-expired-modal";

export default function SpotCheckCheckinPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const params = useParams();
  const [loading, setLoading] = useState(false);
  const [permissionState, setPermissionState] = useState<"granted" | "denied" | "prompt" | "unknown">("unknown");
  const [spotCheck, SetSpotCheck] = useState<ISpotCheck>();
  const [showExpiredModal, setShowExpiredModal] = useState(false);

 


  const id = params.id as string

  useEffect(() => {
    if (typeof navigator !== "undefined" && (navigator as any).permissions && (navigator as any).permissions.query) {
      try {
        ;(navigator as any).permissions.query({name: 'geolocation'}).then((res: any) => {
          setPermissionState(res.state || 'unknown');
          res.onchange = () => setPermissionState(res.state || 'unknown');
        }).catch(() => setPermissionState('unknown'));
      } catch (e) {
        setPermissionState('unknown');
      }
    }
    fetchSpotCheck()
    // clear any pending redirects to avoid unwanted navigation later
    dispatch(clearRedirect());
  }, []);





  const fetchSpotCheck = async ()=> {
    try{
      const spotcheck = await spotcheckAPI.getById(Number(id))
    // console.log(spotcheck)
      SetSpotCheck(spotcheck)
      
      // Show modal if status is not SENT
      if (spotcheck?.status?.status_name !== "SENT") {
        setShowExpiredModal(true);
      }
    }catch (e) {
      console.warn("Failed to fetch spot check",e)
    }
  }

 

  const requestAndCheckIn = async () => {
    if (!navigator || !navigator.geolocation) {
      toast.error("Geolocation is not supported in this browser.");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        try {
          // Post to backend - send spot check id and location object
          const payload = {
            spot_check_id: id,
            location: { latitude, longitude },
          };
          await spotcheckAPI.checkin({spotCheckId: Number(id), data: payload.location});
          toast.success("Checked in successfully.");
          router.push('/dashboard');
        } catch (err: any) {
          showErrorToast({error:err, defaultMessage:"Failed to check in. Try again."});
          } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error(err);
        setLoading(false);
        if (err.code === 1) {
          toast.error("Location permission denied. Please allow location access to check in.");
        } else {
          toast.error("Unable to retrieve your location.");
        }
      },
      {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
    );
  };

  const handleRedirectToProfile = () => {
    if (spotCheck?.employee) {
      router.push(`/employees/profile/${spotCheck.employee}`);
    } else {
      // Fallback to dashboard if no employee ID
      router.push('/dashboard');
    }
  };

  const handleCloseExpiredModal = () => {
    setShowExpiredModal(false);
    handleRedirectToProfile();
  };

  return (
    <div className="min-h-[70vh] px-4 shadow-sm bg-white border-none rounded">
      <Card className="w-full mt-4 border-none shadow-none">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Spot Check</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-gray-700">You have been requested to check in for a spot check. We need access to your device location to verify your check-in.</p>

          {permissionState === 'denied' && (
            <div className="p-4 bg-red-50 rounded-md text-red-800">Location access is denied. Please enable location permissions in your browser settings and reload this page.</div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Button
              onClick={requestAndCheckIn}
              className="rounded-xl px-6 py-3 shadow-md hover:opacity-95"
              disabled={loading || spotCheck?.status.status_name !== 'SENT'}
            >
              {loading ? 'Checking in...' : 'Allow location & Check in'}
            </Button>

            <Button
              variant="ghost"
              className="rounded-full px-6 py-3"
              onClick={() => router.push('/dashboard')}
            >
              Cancel
            </Button>
          </div>

          <div className="text-sm text-gray-500">Your location will only be used to validate this check-in.</div>
        </CardContent>
      </Card>

      <SpotcheckExpiredModal
        isOpen={showExpiredModal}
        onClose={handleCloseExpiredModal}
        onRedirectToProfile={handleRedirectToProfile}
      />
    </div>
  );
}
