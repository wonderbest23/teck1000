/** @type {import('next').NextConfig} */
const nextConfig = {
  // pg는 서버 번들에 포함하지 않고 런타임 require로 외부화 (Cloudflare Workers 호환)
  serverExternalPackages: ["pg", "pg-cloudflare"],
};

export default nextConfig;
