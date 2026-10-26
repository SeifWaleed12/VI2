import { isValidElement, type ReactElement, type ReactNode } from "react";
import ReviewForm from "../ReviewForm";
import { REVIEW_COPY } from "../copy";
import type { OwnReview } from "@/types/review";
const states: unknown[] = [];
let index = 0;
let refIndex = 0;
const refs: {current: {focus: () => void;scrollIntoView: () => void} | null}[] = [];
const effects: (() => void)[] = [];
jest.mock("react", () => ({ ...jest.requireActual("react"), useId: () => "review-form", useRef: () => refs[refIndex++] ?? (refs[refIndex-1]={current:{focus:jest.fn(),scrollIntoView:jest.fn()}}), useEffect: (effect:()=>void) => effects.push(effect),
 useState: (initial: unknown) => { const key=index++; if (!(key in states)) states[key]=initial; return [states[key],(next:unknown)=>{states[key]=next}]; },
}));
jest.mock("../Reviews.module.css", () => ({}));
jest.mock("lucide-react", () => ({ Star: () => null }));
type Props={children?:ReactNode;onChange?:(event:{target:{value:string}})=>void;onSubmit?:(event:{preventDefault:()=>void})=>Promise<void>;value?:unknown;role?:string;"aria-invalid"?:boolean;"aria-describedby"?:string;noValidate?:boolean};
function walk(node:ReactNode):ReactElement<Props>[] { if(Array.isArray(node)) return node.flatMap(walk); if(!isValidElement<Props>(node))return[]; return [node,...walk(node.props.children)]; }
const review:OwnReview={id:"r",first_name:"Sara",rating:4,title:"Saved title",content:"Previously saved feedback for this product.",version:1,status:"approved",moderation_reason:null,created_at:"2026-10-20",updated_at:"2026-10-20"};
const onSave=jest.fn();
function render(current:OwnReview|null=review, options: Partial<Parameters<typeof ReviewForm>[0]> = {}) { index=0; refIndex=0; effects.length=0; return walk(ReviewForm({review:current,copy:REVIEW_COPY.en,busy:false,onSave,onCancel:jest.fn(),...options})); }
beforeEach(()=>{states.length=0;refs.length=0;effects.length=0;jest.clearAllMocks()});
it("retains typed feedback after failed saving and after explicitly reloading the saved version",async()=>{
 let tree=render();
 tree.find(node=>node.type==="textarea")!.props.onChange!({target:{value:"My unsaved draft must survive a failed request."}});
 onSave.mockResolvedValue(undefined);
 tree=render(); await tree.find(node=>node.type==="form")!.props.onSubmit!({preventDefault:jest.fn()});
 expect(render().find(node=>node.type==="textarea")!.props.value).toContain("My unsaved draft");
 tree=render({...review,version:2,content:"A different saved review from another session."});
 await tree.find(node=>node.type==="form")!.props.onSubmit!({preventDefault:jest.fn()});
 expect(onSave).toHaveBeenLastCalledWith(expect.objectContaining({content:"My unsaved draft must survive a failed request.",version:2}));
});
it("validates trimmed feedback without destroying the draft",async()=>{
 let tree=render(); tree.find(node=>node.type==="textarea")!.props.onChange!({target:{value:"                    "}});
 tree=render(); await tree.find(node=>node.type==="form")!.props.onSubmit!({preventDefault:jest.fn()});
 expect(onSave).not.toHaveBeenCalled();
 tree=render();expect(tree.some(node=>node.props.role==="alert")).toBe(true);
 expect(tree.find(node=>node.type==="textarea")!.props["aria-invalid"]).toBe(true);
 expect(tree.find(node=>node.type==="textarea")!.props.value).toBe("                    ");
});

it.each(["en", "ar"] as const)("uses localized validation and focuses short feedback in %s", async locale => {
 let tree=render(review,{copy:REVIEW_COPY[locale]});
 expect(tree.find(node=>node.type==="form")!.props.noValidate).toBe(true);
 tree.find(node=>node.type==="textarea")!.props.onChange!({target:{value:"Too short"}});
 tree=render(review,{copy:REVIEW_COPY[locale]});
 await tree.find(node=>node.type==="form")!.props.onSubmit!({preventDefault:jest.fn()});
 expect(refs[2].current!.focus).toHaveBeenCalledWith({preventScroll:true});
 expect(refs[2].current!.scrollIntoView).toHaveBeenCalledWith({block:"center",behavior:"instant"});
 tree=render(review,{copy:REVIEW_COPY[locale]});
 expect(tree.find(node=>node.props.role==="alert")!.props.children).toBe(REVIEW_COPY[locale].invalid);
 expect(tree.find(node=>node.type==="textarea")!.props["aria-invalid"]).toBe(true);
 expect(tree.find(node=>node.type==="input" && node.props.value==="Saved title")!.props["aria-invalid"]).toBeUndefined();
 expect(onSave).not.toHaveBeenCalled();
});
it("waits for busy to clear before focusing a save error",()=>{
 render(review,{busy:true,error:REVIEW_COPY.en.conflict});
 effects.forEach(effect=>effect());
 expect(refs[3].current!.focus).not.toHaveBeenCalled();
 render(review,{busy:false,error:REVIEW_COPY.en.conflict});
 effects.forEach(effect=>effect());
 expect(refs[3].current!.focus).toHaveBeenCalledTimes(1);
});
it("does not submit again while busy and signals edits to dismiss recovery feedback",async()=>{
 const onEdit=jest.fn(); const tree=render(review,{busy:true,onEdit});
 await tree.find(node=>node.type==="form")!.props.onSubmit!({preventDefault:jest.fn()});
 expect(onSave).not.toHaveBeenCalled();
 tree.find(node=>node.type==="textarea")!.props.onChange!({target:{value:"A newly edited draft that stays here."}});
 expect(onEdit).toHaveBeenCalledTimes(1);
});

it.each(["en", "ar"] as const)("puts a missing-rating explanation beside the stars with supported invalid semantics in %s",async locale=>{
 let tree=render(null,{copy:REVIEW_COPY[locale]});
 await tree.find(node=>node.type==="form")!.props.onSubmit!({preventDefault:jest.fn()});
 tree=render(null,{copy:REVIEW_COPY[locale]});
 const group=tree.find(node=>node.props.role==="radiogroup")!;
 const alert=tree.find(node=>node.props.role==="alert")!;
 expect(group.props["aria-invalid"]).toBe(true);
 expect(tree.find(node=>node.type==="fieldset")!.props["aria-invalid"]).toBeUndefined();
 expect(tree.indexOf(alert)).toBeLessThan(tree.indexOf(group));
 expect(alert.props.children).toBe(REVIEW_COPY[locale].ratingRequired);
 expect(tree.filter(node=>node.props.role==="alert")).toHaveLength(1);
 expect(tree.find(node=>node.type==="textarea")!.props["aria-describedby"]).toBe("review-form-help");
 expect(refs[0].current!.focus).toHaveBeenCalledTimes(1);
 expect(onSave).not.toHaveBeenCalled();
});
it("removes stale validation on the next edit",async()=>{
 let tree=render();tree.find(node=>node.type==="textarea")!.props.onChange!({target:{value:"Short"}});
 tree=render();await tree.find(node=>node.type==="form")!.props.onSubmit!({preventDefault:jest.fn()});
 tree=render();expect(tree.some(node=>node.props.role==="alert")).toBe(true);
 tree.find(node=>node.type==="textarea")!.props.onChange!({target:{value:"Now this feedback is long enough to submit."}});
 tree=render();expect(tree.some(node=>node.props.role==="alert")).toBe(false);
 expect(tree.find(node=>node.type==="textarea")!.props["aria-invalid"]).toBeUndefined();
});
