"use client";
import {unsplash} from "@/lib/unsplash";
import { cn } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import { defaultImages } from "@/constants/images";
import Link from "next/link";
import { FormErrors } from "./form-errors";

interface UnsplashImage {
    id: string;
    urls: {
        thumb: string;
        full: string;
        regular: string;
        small: string;
    };
    links: {
        html: string;
        self?: string;
        download?: string;
        download_location?: string;
    };
    user: {
        name: string;
        username?: string;
        id?: string;
    };
}

interface FormPickerProps {
    id: string;
    errors?: Record<string, string[] | undefined>;
};

export const FormPicker = ({
    id,
    errors,
}: FormPickerProps) => {
    const {pending} = useFormStatus();
    const [images, setImages] = useState<UnsplashImage[]>(defaultImages);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

    useEffect(() => {
        const fetchImages = async () => {
            try {
                const result = await unsplash.photos.getRandom({
                        collectionIds: ["317099"],
                        count: 9,
                });

                if (result && result.response) {
                    // When count > 1, response is an array; when count = 1, response is a single object
                    const response = result.response as UnsplashImage | UnsplashImage[];
                    const newImages = Array.isArray(response) 
                        ? response 
                        : [response];
                    setImages(newImages);
                } else {
                    console.error("Failed to fetch images");
                }
            } catch (error) {
                console.log(error);
                setImages(defaultImages);
            } finally {
                setIsLoading(false);
            }
        };
        fetchImages();
    }, []);

    if (isLoading) {
        return (
            <div className="p-6 flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-shadow-sky-700 animate-spin" />
            </div>
        );
    }
    return (
        <div className="relative">
            <div className="grid grid-cols-3 gap-2 mb-2">
                {images.map((image)=>(
                    <div
                        key={image.id}
                        className={cn(
                            "cursor-pointer relative aspect-video group hover:opacity-75 transition bg-muted",
                            selectedImageId === image.id && "ring-2 ring-primary ring-offset-2",
                            pending && "opacity-50 hover:opacity-50 cursor-auto"
                        )}
                        onClick={() => {
                            if(pending) return;
                            setSelectedImageId(image.id);
                        }}
                    >
                        <input 
                            type="radio" 
                            id={`${id}-${image.id}`}
                            name={id} 
                            className="hidden" 
                            checked={selectedImageId === image.id}
                            disabled={pending}
                            onChange={() => {
                                if(!pending) {
                                    setSelectedImageId(image.id);
                                }
                            }}
                            value={`${image.id}|${image.urls.thumb}|${image.urls.full}|${image.links.html}|${image.user.name}`}    
                        />

                        <Image
                            src={image.urls.thumb}
                            alt="Unsplash Image"
                            fill
                            className="object-cover rounded-sm"
                        />
                        {selectedImageId === image.id && (
                            <div className="absolute inset-y-0 h-full w-full bg-black/30 flex items-center justify-center">
                                <Check className="h-4 w-4 text-white" />
                            </div>

                        )}
                        <Link 
                            href={image.links.html}
                            target="_blank"
                            className="opacity-0 group-hover:opacity-100 transition absolute bottom-0 w-full text-[10px] truncate text-white hover:underline p-1 bg-black/50"
                        >
                            {image.user.name}
                        </Link>
                    </div>
                ))}
            </div>
            <FormErrors id={id} errors={errors} />
        </div>
    );
};