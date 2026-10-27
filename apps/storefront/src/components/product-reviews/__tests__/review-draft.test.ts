import { keepReviewDraft, readReviewDraft, clearReviewDraft } from "../review-draft";
const draft={rating:2,title:"Unsaved",content:"Only this customer's temporary draft."};
const originalWindow=Object.getOwnPropertyDescriptor(globalThis,"window");
beforeEach(()=>Object.defineProperty(globalThis,"window",{value:{},configurable:true}));
afterEach(()=>{clearReviewDraft("p","a");jest.restoreAllMocks();if(originalWindow)Object.defineProperty(globalThis,"window",originalWindow);else Reflect.deleteProperty(globalThis,"window");});
it("recovers only the same customer and product after a client-side sign-in round trip",()=>{
 keepReviewDraft("p","a",draft);
 expect(readReviewDraft("p","a")).toEqual(draft);
 expect(readReviewDraft("p","b")).toBeNull();expect(readReviewDraft("other","a")).toBeNull();
 expect(readReviewDraft("p","a")).toEqual(draft);
});
it("expires after15minutes and clears on success/cancel",()=>{
 const now=Date.now();keepReviewDraft("p","a",draft);clearReviewDraft("p","a");expect(readReviewDraft("p","a")).toBeNull();
 keepReviewDraft("p","a",draft);jest.spyOn(Date,"now").mockReturnValue(now+16*60*1000);expect(readReviewDraft("p","a")).toBeNull();
});
it("does not persist or share drafts during server rendering",()=>{
 Reflect.deleteProperty(globalThis,"window");keepReviewDraft("p","a",draft);expect(readReviewDraft("p","a")).toBeNull();
 Object.defineProperty(globalThis,"window",{value:{},configurable:true});expect(readReviewDraft("p","a")).toBeNull();
});
