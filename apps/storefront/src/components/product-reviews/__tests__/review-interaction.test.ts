import { isValidElement, type ReactElement, type ReactNode } from "react";
import ReviewWriter from "../ReviewWriter";
import ProductReviews from "../ProductReviews";
import ReviewForm from "../ReviewForm";
import { REVIEW_COPY } from "../copy";
import type { useOwnReview } from "../use-own-review";
const states: unknown[]=[];
const refs: {current: unknown}[]=[];
const effects: (()=>void)[]=[];
let stateIndex=0,refIndex=0;
let own: ReturnType<typeof useOwnReview>;
jest.mock("react",()=>({...jest.requireActual("react"),useId:()=>"test",useEffect:(fn:()=>void)=>effects.push(fn),useRef:(initial:unknown)=>refs[refIndex++]??(refs[refIndex-1]={current:initial}),useState:(initial:unknown)=>{const i=stateIndex++;if(!(i in states))states[i]=typeof initial==="function"?initial():initial;return[states[i],(value:unknown)=>{states[i]=value}];}}));
jest.mock("../Reviews.module.css",()=>({}));
jest.mock("next/navigation",()=>({useRouter:()=>({push:jest.fn(),refresh:jest.fn()})}));
jest.mock("@/context/AuthContext",()=>({useAuth:()=>({customer:{id:"a"},isLoading:false,refreshCustomer:jest.fn()})}));
jest.mock("../use-own-review",()=>({useOwnReview:()=>own}));
jest.mock("../use-product-reviews",()=>({useProductReviews:()=>({page:null,query:{offset:0,sort:"newest"},error:false,loading:false,refresh:jest.fn()})}));
type Props={children?:ReactNode;ref?:{current:unknown};onClick?:()=>void;onEdit?:()=>void;recovered?:boolean};
function walk(node:ReactNode):ReactElement<Props>[]{if(Array.isArray(node))return node.flatMap(walk);if(!isValidElement<Props>(node))return[];return[node,...walk(node.props.children)]}
function useRender(fn:()=>ReactNode){stateIndex=0;refIndex=0;effects.length=0;const tree=walk(fn());for(const node of tree){if(node.props.ref)node.props.ref.current={focus:jest.fn()}}return tree}
const writer=(draft:Parameters<typeof ReviewWriter>[0]["draft"]=null)=>ReviewWriter({own,copy:REVIEW_COPY.en,open:true,draft,onDraft:jest.fn(),onClose:jest.fn(),onSaved:jest.fn(),onSignIn:jest.fn()});
beforeEach(()=>{states.length=0;refs.length=0;effects.length=0;own={review:{id:"r",rating:4,title:null,content:"Previously saved feedback here.",first_name:"Sara",created_at:"2026-10-20",updated_at:"2026-10-20",status:"approved",version:1,moderation_reason:null},busy:false,loaded:true,readError:false,error:null,sessionExpired:false,reload:jest.fn(),save:jest.fn(),withdraw:jest.fn()}});
it("does not call a failed attempt a restored draft, and clears genuine recovery after editing",()=>{
 const draft={rating:4,title:"",content:"A sufficiently detailed retained draft."};
 useRender(()=>writer());
 own.error=409;
 let tree=useRender(()=>writer(draft));
 expect(tree.find(node=>node.type===ReviewForm)!.props.recovered).toBe(false);
 states.length=0;refs.length=0;
 tree=useRender(()=>writer(draft));
 expect(tree.find(node=>node.type===ReviewForm)!.props.recovered).toBe(true);
 tree.find(node=>node.type===ReviewForm)!.props.onEdit!();
 expect(useRender(()=>writer(draft)).find(node=>node.type===ReviewForm)!.props.recovered).toBe(false);
});
it("focuses withdrawal confirmation and returns focus when it is cancelled",()=>{
 let tree=useRender(()=>writer());
 tree.find(node=>node.props.children===REVIEW_COPY.en.withdraw)!.props.onClick!();
 tree=useRender(()=>writer());effects.forEach(fn=>fn());
 expect((tree.find(node=>node.props.children===REVIEW_COPY.en.confirm)!.props.ref!.current as {focus:jest.Mock}).focus).toHaveBeenCalled();
 tree.find(node=>node.props.children===REVIEW_COPY.en.cancel)!.props.onClick!();
 tree=useRender(()=>writer());effects.forEach(fn=>fn());
 expect((tree.find(node=>node.props.children===REVIEW_COPY.en.withdraw)!.props.ref!.current as {focus:jest.Mock}).focus).toHaveBeenCalled();
});
it("defers closing focus until the write action is enabled after saving",()=>{
 const page=()=>ProductReviews({productId:"p",locale:"en",initial:null});
 let tree=useRender(page);
 own.busy=true;
 const writerNode=tree.find(node=>node.type===ReviewWriter)! as ReactElement<{onSaved:()=>void}>;
 writerNode.props.onSaved();
 tree=useRender(page);effects.forEach(fn=>fn());
 const button=tree.find(node=>node.type==="button")!;
 expect((button.props.ref!.current as {focus:jest.Mock}).focus).not.toHaveBeenCalled();
 own.busy=false;
 tree=useRender(page);effects.forEach(fn=>fn());
 expect((tree.find(node=>node.type==="button")!.props.ref!.current as {focus:jest.Mock}).focus).toHaveBeenCalledTimes(1);
});
