import { getOwnReview, submitReview, withdrawReview, ReviewRequestError } from "../reviews";
jest.mock("../../client",()=>({medusa:{client:{fetch:jest.fn()}}}));
afterEach(()=>jest.restoreAllMocks());
it("asserts the displayed customer on every private request, without putting identity in the review body",async()=>{
 const fetcher=jest.spyOn(global,"fetch").mockResolvedValue(new Response(JSON.stringify({review:null})));
 await getOwnReview("p","ar","customer_a");
 expect(fetcher).toHaveBeenLastCalledWith("/api/reviews/p?locale=ar",expect.objectContaining({method:"GET",headers:{"x-review-customer-id":"customer_a"},cache:"no-store"}));
 fetcher.mockImplementation(async()=>new Response(JSON.stringify({review:null})));
 const draft={rating:4,title:"",content:"This is my review of the product."};
 await submitReview("p","en","customer_a",draft);
 expect(fetcher).toHaveBeenLastCalledWith("/api/reviews/p?locale=en",expect.objectContaining({method:"POST",headers:{"x-review-customer-id":"customer_a","Content-Type":"application/json"},body:JSON.stringify(draft)}));
 await withdrawReview("p","en","customer_a",3);
 expect(fetcher).toHaveBeenLastCalledWith("/api/reviews/p?locale=en",expect.objectContaining({method:"DELETE",headers:{"x-review-customer-id":"customer_a","Content-Type":"application/json"},body:JSON.stringify({version:3})}));
});
it("surfaces an account assertion mismatch to the session recovery flow",async()=>{
 jest.spyOn(global,"fetch").mockResolvedValue(new Response("{}",{status:401}));
 await expect(submitReview("p","en","stale_customer",{rating:3,title:"",content:"An unsaved review for this product."})).rejects.toEqual(new ReviewRequestError(401));
});
