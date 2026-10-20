import { fileModules } from "../file-config"

const bucketEnv = {
  S3_FILE_URL: " https://media.example.com/ ",
  S3_BUCKET: "vi2-media",
  S3_ENDPOINT: "https://account.r2.cloudflarestorage.com",
  S3_ACCESS_KEY_ID: "key-id",
  S3_SECRET_ACCESS_KEY: "secret",
}

it("stores uploads in the bucket when every S3 variable is set", () => {
  expect(fileModules(bucketEnv)).toEqual([{
    resolve: "@medusajs/medusa/file",
    options: {
      providers: [{
        resolve: "@medusajs/medusa/file-s3",
        id: "s3",
        options: {
          file_url: "https://media.example.com",
          bucket: "vi2-media",
          endpoint: "https://account.r2.cloudflarestorage.com",
          region: "auto",
          access_key_id: "key-id",
          secret_access_key: "secret",
          acl: false,
        },
      }],
    },
  }])
  expect(fileModules({ ...bucketEnv, S3_REGION: "eu-central-1" })[0].options.providers[0].options.region).toBe("eu-central-1")
})

it("keeps Medusa's local disk without S3 variables outside production, and always in tests", () => {
  expect(fileModules({})).toEqual([])
  expect(fileModules({ S3_BUCKET: "  " })).toEqual([])
  expect(fileModules({ ...bucketEnv, NODE_ENV: "test" })).toEqual([])
})

it("refuses a partial setup", () => {
  expect(() => fileModules({ ...bucketEnv, S3_SECRET_ACCESS_KEY: "" })).toThrow("Set all of S3_FILE_URL")
})

it("refuses to start production without a bucket", () => {
  expect(() => fileModules({ NODE_ENV: "production" })).toThrow("Set all of S3_FILE_URL")
  expect(fileModules({ ...bucketEnv, NODE_ENV: "production" })).toHaveLength(1)
})
