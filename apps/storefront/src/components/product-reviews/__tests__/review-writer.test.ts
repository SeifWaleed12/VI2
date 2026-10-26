import { createElement } from "react";
import { renderToString } from "react-dom/server";
import ReviewWriter from "../ReviewWriter";
import { REVIEW_COPY } from "../copy";
import type { useOwnReview } from "../use-own-review";
jest.mock("../Reviews.module.css", () => ({ __esModule:true, default:new Proxy({}, {get:(_,key)=>String(key)}) }));
const state = (error:number|null, readError=false): ReturnType<typeof useOwnReview> => ({review:null,loaded:true,readError,error,busy:false,sessionExpired:error===401,reload:jest.fn(async()=>true),save:jest.fn(async()=>false),withdraw:jest.fn(async()=>false)});
it.each([400,409,429,503])("keeps a new-review form mounted after save status%s",error=>{
 const html=renderToString(createElement(ReviewWriter,{own:state(error),copy:REVIEW_COPY.en,open:true,draft:null,onDraft:jest.fn(),onClose:jest.fn(),onSaved:jest.fn(),onSignIn:jest.fn()}));
 expect(html).toContain("<form");expect(html).toContain('role="alert"');expect(html).not.toContain(REVIEW_COPY.en.ownUnavailable);
});
it("blocks a new form when the initial private read fails",()=>{
 const html=renderToString(createElement(ReviewWriter,{own:state(503,true),copy:REVIEW_COPY.en,open:true,draft:null,onDraft:jest.fn(),onClose:jest.fn(),onSaved:jest.fn(),onSignIn:jest.fn()}));
 expect(html).not.toContain("<form");expect(html).toContain(REVIEW_COPY.en.ownUnavailable);
});
it("restores an account-scoped draft at the form boundary after reauthentication",()=>{
 const draft={rating:2,title:"My retained title",content:"My unsaved review after an expired session."};
 const html=renderToString(createElement(ReviewWriter,{own:state(null),copy:REVIEW_COPY.en,open:true,draft,onDraft:jest.fn(),onClose:jest.fn(),onSaved:jest.fn(),onSignIn:jest.fn()}));
 expect(html).toContain(draft.title);expect(html).toContain(draft.content);expect(html).toContain(REVIEW_COPY.en.recovered);
});
