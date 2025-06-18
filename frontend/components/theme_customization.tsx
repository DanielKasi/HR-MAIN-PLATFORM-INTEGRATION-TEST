"use client";

import {useState, useEffect, type FormEvent} from "react";
import {AlertCircle, CheckCircle, History} from "lucide-react";
import {useSelector} from "react-redux";
import {useDispatch} from "react-redux";

import apiRequest from "@/lib/apiRequest";
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Slider} from "@/components/ui/slider";
import {getDefaultInstitutionId, getInstitutionById} from "@/lib/helpers";
import {hexToHSL} from "@/app/(dashboard)/layout";
import {selectSelectedInstitution} from "@/store/auth/selectors";
import {removeThemeStart, updateThemeStart} from "@/store/auth/actions";

// import updateThemeColors from "@/app/(dashboard)/layout";

interface ThemeColorFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onColorUpdateSuccess: () => void;
}

// interface InstitutionThemeData {
//   id: number;
//   theme_color: string;
//   recent_colors?: string[];
// }

// interface ColorOption {
//   name: string;
//   value: string;
// }

interface StoredColorData {
  colors: string[];
  timestamp: number;
}

// Predefined color palettes,
const colorPalettes = {
  modern: [
    {name: "Deep Blue", value: "#1e40af"},
    {name: "Forest Green", value: "#166534"},
    {name: "Ruby Red", value: "#be123c"},
    {name: "Royal Purple", value: "#7e22ce"},
    {name: "Charcoal", value: "#1f2937"},
    {name: "Teal", value: "#0d9488"},
  ],
  pastel: [
    {name: "Lavender", value: "#c4b5fd"},
    {name: "Mint", value: "#a7f3d0"},
    {name: "Peach", value: "#fed7aa"},
    {name: "Sky Blue", value: "#bae6fd"},
    {name: "Rose", value: "#fecdd3"},
    {name: "Cream", value: "#fef3c7"},
  ],
  vibrant: [
    {name: "Electric Blue", value: "#3b82f6"},
    {name: "Lime Green", value: "#84cc16"},
    {name: "Hot Pink", value: "#ec4899"},
    {name: "Orange", value: "#f97316"},
    {name: "Cyan", value: "#06b6d4"},
    {name: "Amber", value: "#f59e0b"},
  ],
};

// Function to convert hex to RGB
const hexToRgb = (hex: string): [number, number, number] => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  return [r, g, b];
};

// Function to convert RGB to hex
const rgbToHex = (r: number, g: number, b: number): string => {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const hex = x.toString(16);

        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
  );
};

// Function to calculate text color based on background for contrast
const getTextColor = (bgColor: string): string => {
  const [r, g, b] = hexToRgb(bgColor);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? "#000000" : "#ffffff";
};

// Storage key constant
const STORAGE_KEY = "themeColorData";

export function ThemeColorForm({isOpen, onOpenChange, onColorUpdateSuccess}: ThemeColorFormProps) {
  const [themeColor, setThemeColor] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  // const [InstitutionData, setInstitutionData] = useState<InstitutionThemeData | null>(null);
  const [activeTab, setActiveTab] = useState("picker");
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [isResetting, setIsResetting] = useState(false);
  const [rgbValues, setRgbValues] = useState<[number, number, number]>([0, 0, 0]);
  const [textColor, setTextColor] = useState("#ffffff");

  const InstitutionId = getDefaultInstitutionId();
  const selectedInstitution = useSelector(selectSelectedInstitution);
  const dispatch = useDispatch();

  // Clear success/error messages when reopening the dialog
  useEffect(() => {
    if (isOpen) {
      setErrorMessage("");
      setSuccessMessage("");

      if (selectedInstitution) {
        fetchInstitutionThemeData(selectedInstitution.id);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedInstitution) {
      setThemeColor(selectedInstitution.theme_color || "#000000");
    }
  }, [selectedInstitution]);

  useEffect(() => {
    // Update RGB values when theme color changes
    const [r, g, b] = hexToRgb(themeColor);

    setRgbValues([r, g, b]);
    setTextColor(getTextColor(themeColor));
  }, [themeColor]);

  const getStoredColorData = (): string[] => {
    try {
      const storedData = localStorage.getItem(STORAGE_KEY);

      if (!storedData) return [];

      const parsedData: StoredColorData = JSON.parse(storedData);
      const currentTime = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;

      if (currentTime - parsedData.timestamp > oneDayMs) {
        dispatch(removeThemeStart());
        localStorage.removeItem(STORAGE_KEY);

        return [];
      }

      return parsedData.colors;
    } catch (error) {
      console.log("Error retrieving color data from local storage:", error);

      return [];
    }
  };

  const saveColorData = (colors: string[]) => {
    try {
      const colorData: StoredColorData = {
        colors,
        timestamp: Date.now(),
      };

      if (colors) {
        dispatch(updateThemeStart(colorData));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(colorData));
      }
    } catch (error) {
      console.log("Error saving color data to local storage:", error);
    }
  };

  const fetchInstitutionThemeData = async (InstitutionId: number) => {
    try {
      const response = await getInstitutionById(InstitutionId);
      const data = response.data;

      // setInstitutionData(data);

      setThemeColor(data.theme_color || "#000000");

      // updateThemeColors(data.theme_color);

      const storedColors = getStoredColorData();

      // Set recent colors if available from API or use stored colors
      if (
        data.recent_colors &&
        Array.isArray(data.recent_colors) &&
        data.recent_colors.length > 0
      ) {
        setRecentColors(data.recent_colors);
        saveColorData(data.recent_colors);
      } else {
        setRecentColors(storedColors);
      }
    } catch (error) {
      setErrorMessage("Failed to fetch Institution theme data");
      console.log("Error fetching Institution theme data:", error);
    }
  };

  const handleResetColorTheme = async () => {
    if (!InstitutionId) return;

    setIsResetting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      // Create a FormData object for the API request
      const formData = new FormData();

      // Use an empty string to reset the theme color (not a space!)
      formData.append("theme_color", "");

      const response = await apiRequest.patch(`institution/${InstitutionId}/`, formData);

      if (response.status !== 200) {
        throw new Error("Failed to reset theme color");
      }

      setRecentColors([]);
      saveColorData([]);

      setThemeColor("");

      // Reset RGB values
      const event = new CustomEvent("Institution_data_updated");

      window.dispatchEvent(event);

      setSuccessMessage("Theme color reset successfully!");
      setTimeout(() => {
        onOpenChange(false);
        if (onColorUpdateSuccess) onColorUpdateSuccess();
      }, 1500);
    } catch (error: any) {
      setErrorMessage(error.message || "An error occurred while resetting the theme color");
      console.log("Error resetting theme color:", error);
    } finally {
      setIsResetting(false);
    }
  };

  // const updateRecentColors = (color: string) => {
  //   const updatedColors = [color, ...recentColors.filter((c) => c !== color)].slice(0, 8);

  //   setRecentColors(updatedColors);
  //   saveColorData(updatedColors);

  //   return updatedColors;
  // };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const formData = new FormData();

      formData.append("theme_color", themeColor);

      const response = await apiRequest.patch(`institution/${InstitutionId}/`, formData);

      if (response.status !== 200) {
        throw new Error("Failed to update theme color");
      }

      const hslColor = hexToHSL(themeColor);

      document.documentElement.style.setProperty("--primary", hslColor);
      document.documentElement.style.setProperty("--ring", hslColor);
      document.documentElement.style.setProperty("--sidebar-accent", hslColor);

      const event = new CustomEvent("Institution_data_updated");

      window.dispatchEvent(event);
      saveColorData([themeColor]);
      setSuccessMessage("Theme color updated successfully!");
      setTimeout(() => {
        onOpenChange(false);
        if (onColorUpdateSuccess) onColorUpdateSuccess();
      }, 1500);
    } catch (error: any) {
      setErrorMessage(error.message || "An error occurred while updating the theme color");
      console.log("Error updating theme color:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRgbChange = (index: number, value: number) => {
    const newRgb = [...rgbValues];

    newRgb[index] = value;
    setRgbValues(newRgb as [number, number, number]);
    setThemeColor(rgbToHex(newRgb[0], newRgb[1], newRgb[2]));
  };

  const handleColorSelection = (color: string) => {
    setThemeColor(color);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Customize Theme Color</DialogTitle>
          <DialogDescription>
            Select your brand color to personalize your Institution's appearance
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          {errorMessage && (
            <div className="mb-4 p-2 text-sm font-medium text-white bg-red-500 rounded flex items-center gap-2">
              <AlertCircle size={16} />
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-2 text-sm font-medium text-white bg-green-500 rounded flex items-center gap-2">
              <CheckCircle size={16} />
              {successMessage}
            </div>
          )}

          <Tabs className="w-full" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="picker">Color Picker</TabsTrigger>
              <TabsTrigger value="palettes">Palettes</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
              <TabsTrigger value="recent">Recent</TabsTrigger>
            </TabsList>

            <TabsContent className="space-y-4 py-4" value="picker">
              <div className="flex flex-col space-y-4">
                <div className="flex gap-4 items-center">
                  <input
                    className="h-12 w-16 cursor-pointer border rounded"
                    id="themeColorPicker"
                    type="color"
                    value={themeColor}
                    onChange={(e) => setThemeColor(e.target.value)}
                  />
                  <div className="flex-1">
                    <Label htmlFor="hexValue">Hex Code</Label>
                    <input
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      id="hexValue"
                      type="text"
                      value={themeColor}
                      onChange={(e) => {
                        // Basic validation for hex code
                        const value = e.target.value;

                        if (
                          /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value) ||
                          /^#[A-Fa-f0-9]{0,5}$/.test(value)
                        ) {
                          setThemeColor(value);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent className="space-y-4 py-4" value="palettes">
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(colorPalettes).map(([paletteName, colors]) => (
                  <div key={paletteName} className="space-y-2">
                    <h3 className="text-sm font-medium capitalize">{paletteName}</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {colors.map((color) => (
                        <div
                          key={color.value}
                          className="h-8 rounded cursor-pointer border hover:scale-105 transition-transform"
                          style={{backgroundColor: color.value}}
                          title={color.name}
                          onClick={() => handleColorSelection(color.value)}
                          role="color-selector"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent className="space-y-4 py-4" value="advanced">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Red ({rgbValues[0]})</Label>
                  </div>
                  <Slider
                    className="bg-gradient-to-r from-black to-red-600"
                    max={255}
                    min={0}
                    step={1}
                    value={[rgbValues[0]]}
                    onValueChange={(value) => handleRgbChange(0, value[0])}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Green ({rgbValues[1]})</Label>
                  </div>
                  <Slider
                    className="bg-gradient-to-r from-black to-green-600"
                    max={255}
                    min={0}
                    step={1}
                    value={[rgbValues[1]]}
                    onValueChange={(value) => handleRgbChange(1, value[0])}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Blue ({rgbValues[2]})</Label>
                  </div>
                  <Slider
                    className="bg-gradient-to-r from-black to-blue-600"
                    max={255}
                    min={0}
                    step={1}
                    value={[rgbValues[2]]}
                    onValueChange={(value) => handleRgbChange(2, value[0])}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent className="space-y-4 py-4" value="recent">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <History size={16} />
                  <span className="text-sm font-medium">Recently Used Colors</span>
                  <span className="text-xs text-muted-foreground">(expires after 24 hours)</span>
                </div>
                {recentColors.length > 0 ? (
                  <div className="grid grid-cols-4 gap-3">
                    {recentColors.map((color, index) => (
                      <div key={index} className="flex flex-col items-center gap-1">
                        <div
                          className="h-12 w-12 rounded cursor-pointer border hover:scale-105 transition-transform"
                          style={{backgroundColor: color}}
                          onClick={() => handleColorSelection(color)}
                        />
                        <span className="text-xs">{color}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No recent colors found.</p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-2 pt-4">
            <p className="text-sm font-medium">Preview:</p>
            <div className="space-y-4">
              <div className="rounded-md p-6" style={{backgroundColor: themeColor}}>
                <div className="flex flex-col gap-2 items-center justify-center">
                  <h3 className="font-semibold text-lg" style={{color: textColor}}>
                    Theme Preview
                  </h3>
                  <p className="text-sm text-center" style={{color: textColor}}>
                    This is how your primary color will appear throughout your store
                  </p>
                  <button
                    className="px-4 py-2 rounded-md mt-2"
                    style={{
                      backgroundColor: textColor,
                      color: themeColor,
                    }}
                  >
                    Sample Button
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="p-2 rounded" style={{backgroundColor: themeColor, opacity: 0.25}}>
                  <span className="text-xs font-medium">25%</span>
                </div>
                <div className="p-2 rounded" style={{backgroundColor: themeColor, opacity: 0.5}}>
                  <span className="text-xs font-medium">50%</span>
                </div>
                <div className="p-2 rounded" style={{backgroundColor: themeColor, opacity: 0.75}}>
                  <span className="text-xs font-medium">75%</span>
                </div>
                <div className="p-2 rounded" style={{backgroundColor: themeColor}}>
                  <span className="text-xs font-medium">100%</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={isSubmitting || isResetting}
              type="button"
              variant="destructive"
              onClick={handleResetColorTheme}
            >
              {isResetting ? "Resetting..." : "Reset to Default"}
            </Button>

            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? "Updating..." : "Apply Theme Color"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
