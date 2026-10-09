import { Module } from "@medusajs/framework/utils"
import EdaModuleService from "./service"

export const EDA_MODULE = "eda"

export default Module(EDA_MODULE, {
  service: EdaModuleService,
})
