"use client";

import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {useSelector} from "react-redux";
import Image from "next/image";

import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {selectAttachedInstitutions, selectUser} from "@/store/auth/selectors";

export default function WelcomePage() {
  const [hasInstitution, setHasInstitution] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const router = useRouter();
  const InstitutionsAttached = useSelector(selectAttachedInstitutions);
  const userData = useSelector(selectUser);

  useEffect(() => {
    if (userData) {
      try {
        setUserName(userData.fullname || "");
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }

    if (InstitutionsAttached && InstitutionsAttached.length > 0) {
      setHasInstitution(true);
      router.push("/dashboard");
    } else {
      setHasInstitution(false);
    }

    setIsLoading(false);
  }, [userData, InstitutionsAttached, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (hasInstitution) {
    return null;
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-background">
      <Card className="mx-auto max-w-full w-full h-auto">
        <CardContent className="p-6 sm:p-10">
          <div className="flex flex-col items-center space-y-8">
            <div className="relative w-full max-w-[600px] h-[500px]">
              <Image
                fill
                priority
                alt="Organisation illustration"
                className="object-contain"
                src="/dash.svg"
              />
            </div>

            <div className="space-y-4 text-center grid w-8/12 mx-auto justify-items-center">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Welcome to APPLICATION NAME, {userName}
              </h1>

              <p className="text-muted-foreground text-center">
                Lorem ipsum dolor sit, amet consectetur adipisicing elit. In sunt delectus laborum
                natus, odio iste saepe maxime aliquam at a mollitia, quia fugit ratione non beatae.
                Ut modi ratione dolores!
              </p>

              <Button
                className="mt-6 bg-emerald-500 hover:bg-emerald-600 text-white"
                size="lg"
                onClick={() => router.push("/create-organisation")}
              >
                Create Your Organisation
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
