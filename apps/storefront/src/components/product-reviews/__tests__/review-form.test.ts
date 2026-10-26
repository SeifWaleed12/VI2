import { isValidElement, type ReactElement, type ReactNode } from "react";
import ReviewForm from "../ReviewForm";
import { REVIEW_COPY } from "../copy";
import type { OwnReview } from "@/types/review";
const states: unknown[] = [];
let index = 0;
jest.mock("react", () => ({ ...jest.requireActual("react"), useId: () => "review-form", useRef: () => ({ current: null }), useEffect: () => undefined,
 useState: (initial: unknown) => { const key=index++; if (!(key in states)) states[key]=initial; return [states[key],(next:unknown)=>{states[key]=next}]; },
}));
jest.mock("../Reviews.module.css", () => ({}));
jest.mock("lucide-react", () => ({ Star: () => null }));
type Props={children?:ReactNode;onChange?:(event:{target:{value:string}})=>void;onSubmit?:(event:{preventDefault:()=>void})=>Promise<void>;value?:unknown;role?:string;"aria-invalid"?:boolean};
function walk(node:ReactNode):ReactElement<Props>[] { if(Array.isArray(node)) return node.flatMap(walk); if(!isValidElement<Props>(node))return[]; return [node,...walk(node.props.children)]; }
const review:OwnReview={id:"r",first_name:"Sara",rating:4,title:"Saved title",content:"Previously saved feedback for this product.",version:1,status:"approved",moderation_reason:null,created_at:"2026-10-20",updated_at:"2026-10-20"};
const onSave=jest.fn();
function render(current:OwnReview=review) { index=0; return walk(ReviewForm({review:current,copy:REVIEW_COPY.en,busy:false,onSave,onCancel:jest.fn()})); }
beforeEach(()=>{states.length=0;jest.clearAllMocks()});
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
