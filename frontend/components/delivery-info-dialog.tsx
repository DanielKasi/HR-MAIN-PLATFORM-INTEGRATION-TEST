"use client";

import type React from "react";

import {useState} from "react";

import {Textarea} from "./ui/textarea";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";

interface DeliveryInfoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (info: string) => void;
}

export function DeliveryInfoDialog({isOpen, onClose, onSubmit}: DeliveryInfoDialogProps) {
  const [deliveryInfo, setDeliveryInfo] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDeliveryInfo(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(deliveryInfo);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Enter Delivery Information</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              {/* <Label htmlFor="delivery_info">Driver Name</Label> */}
              <Textarea
                required
                id="delivery_info"
                name="delivery_info"
                placeholder="Enter delivery details such as deliverer's name, time of departure and so on..."
                value={deliveryInfo}
                onChange={handleChange}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Submit</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
