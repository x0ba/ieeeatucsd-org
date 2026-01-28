// Global type declarations for Astro imports
declare module "*.astro" {
  import { AstroIntegration } from "astro";
  
  const AstroComponent: (props: any) => AstroIntegration;
  export default AstroComponent;
}

declare module "*.tsx" {
  const content: any;
  export default content;
}

declare module "*.ts" {
  const content: any;
  export default content;
}
