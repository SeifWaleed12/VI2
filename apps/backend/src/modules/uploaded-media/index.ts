import { Module } from "@medusajs/framework/utils"
import UploadedMediaService from "./service"

export const UPLOADED_MEDIA_MODULE = "uploadedMedia"
export default Module(UPLOADED_MEDIA_MODULE, { service: UploadedMediaService })
