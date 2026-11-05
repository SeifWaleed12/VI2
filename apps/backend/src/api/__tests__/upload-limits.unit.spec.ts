import { limitUploadRequest, MAX_UPLOAD_REQUEST_BYTES } from "../upload-limits"

const call = (originalUrl: string, headers: Record<string, string>, method = "POST") => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() }
  const next = jest.fn()
  limitUploadRequest({ method, originalUrl, headers } as never, res as never, next)
  return { status: res.status.mock.calls[0]?.[0], next: next.mock.calls.length }
}

it("refuses an upload larger than the limit before it is read", () => {
  expect(call("/admin/uploads", { "content-length": String(MAX_UPLOAD_REQUEST_BYTES + 1) })).toEqual({ status: 413, next: 0 })
  expect(call("/ADMIN/UPLOADS/", { "content-length": String(MAX_UPLOAD_REQUEST_BYTES + 1) })).toEqual({ status: 413, next: 0 })
})

it("refuses an upload that does not state its size", () => {
  expect(call("/admin/uploads", {})).toEqual({ status: 411, next: 0 })
  expect(call("/admin/uploads", { "content-length": "many" })).toEqual({ status: 411, next: 0 })
})

it("lets uploads within the limit and every other request through", () => {
  expect(call("/admin/uploads", { "content-length": "1024" })).toEqual({ status: undefined, next: 1 })
  expect(call("/admin/uploads?x=1", { "content-length": "1024" })).toEqual({ status: undefined, next: 1 })
  expect(call("/admin/uploads/presigned-urls", {})).toEqual({ status: undefined, next: 1 })
  expect(call("/admin/uploads", {}, "GET")).toEqual({ status: undefined, next: 1 })
})
