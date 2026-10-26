const fs = require("node:fs")
const assert = require("node:assert/strict")
const path = require("node:path")
const metadata = JSON.parse(fs.readFileSync(path.join(process.env.TEMP, "vi2-review-preview-meta.json")))
const front = "http://localhost:3000"
const product = metadata.productId
const api = "/api/reviews/" + product
const record = []
async function page(locale, slug = "review-preview") {
 const response = await fetch(`${front}/${locale}/products/${slug}`, { signal: AbortSignal.timeout(120000) })
 assert.equal(response.status, 200)
 const text = await response.text()
 assert.ok(text.includes(locale === "ar" ? "تقييمات العملاء" : "Customer reviews"))
 assert.ok(text.includes('id="customer-reviews"'))
 assert.ok(text.includes(locale === "ar" ? 'dir="rtl"' : 'dir="ltr"'))
 return text
}
async function run() {
 const en = await page("en"); const ar = await page("ar")
 assert.ok(en.includes(product), "Refuse to mutate a storefront not serving this disposable fixture")
 assert.ok(en.includes("This is illustrative review feedback")); assert.ok(ar.includes("This is illustrative review feedback"))
 assert.ok(ar.includes("هذا تقييم تجريبي")); assert.ok(en.includes("31 reviews"))
 record.push("EN/AR server markup, original mixed-language feedback and31-review summary")
 const empty = await page("en", "review-empty")
 assert.ok(empty.includes("No reviews yet")); assert.ok(!empty.includes("0 out of 5"))
 record.push("truthful empty state")
 const login = await fetch(front + "/api/auth/login", { method: "POST", headers: { Origin: front, "Content-Type": "application/json" }, body: JSON.stringify({email:"customer@reviews.test",password:"review-preview-password"}) })
 assert.equal(login.status, 200)
 const cookie = login.headers.get("set-cookie").split(";")[0]
 const request = (method, body, origin=front) => fetch(front + api + "?locale=ar", { method, headers: { Cookie: cookie, Origin: origin, "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) })
 assert.equal((await request("POST", {}, "https://attacker.example")).status, 403)
 const draft = {rating:4,title:"My illustrative review",content:"I am checking the real storefront-to-Medusa review flow."}
 const submit = await request("POST", draft); assert.equal(submit.status, 200)
 const first = (await submit.json()).review; assert.equal(first.status, "approved")
 assert.ok((await page("ar")).includes(draft.content))
 const duplicate = await request("POST", draft); assert.equal(duplicate.status, 200); assert.equal((await duplicate.json()).review.id, first.id)
 record.push("real HttpOnly sign-in, same-origin protection, publication without an order and duplicate recovery")
 const flagged = await request("POST", {...draft,version:first.version,content:"Visit www.example.com for my full illustrative review."})
 assert.equal(flagged.status, 200); const pending=(await flagged.json()).review; assert.equal(pending.status,"pending")
 const pendingPage=await page("en"); assert.ok(pendingPage.includes("31 reviews")); assert.ok(!pendingPage.includes("Visit www.example.com for my full illustrative review."))
 const cleaned=await request("POST", {...draft,version:pending.version,content:"This is another illustrative review after correcting my feedback."})
 assert.equal(cleaned.status,200); const approved=(await cleaned.json()).review; assert.equal(approved.status,"approved")
 assert.equal((await request("POST",{...draft,version:first.version})).status,409)
 const withdrawn=await request("DELETE",{version:approved.version});assert.equal(withdrawn.status,200);assert.equal((await withdrawn.json()).review.status,"withdrawn")
 assert.ok((await page("en")).includes("31 reviews"))
 assert.equal((await fetch(front+api)).status,401)
 record.push("flagged content hidden, clean edit publication, stale conflict, withdrawal, guest denial")
 console.log(JSON.stringify({result:"PASS",checks:record},null,2))
}
run().catch(error=>{ console.error(error.message);process.exitCode=1 })
