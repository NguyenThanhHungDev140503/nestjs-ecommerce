{
  description = "NestJS E-commerce Microservices Development Environment";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-24.11";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
        
        # Node.js 20 để tương thích với @types/node ^20.3.1
        nodejs = pkgs.nodejs_20;
        
        # Yarn với Node.js 20
        yarn = pkgs.yarn.override { inherit nodejs; };
      in
      {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            # JavaScript/TypeScript runtime
            nodejs
            yarn
            
            # Database
            postgresql
            
            # Development tools
            git
            docker-compose
          ];

          shellHook = ''
            echo ""
            echo "🚀 NestJS E-commerce Dev Environment"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "📦 Node.js: $(node --version)"
            echo "🧶 Yarn: $(yarn --version)"
            echo "🐘 PostgreSQL: $(psql --version | head -n1)"
            echo ""
            echo "💡 Quick commands:"
            echo "   yarn install    - Install dependencies"
            echo "   yarn start:dev  - Start development server"
            echo ""
            
            # Set NODE_ENV mặc định
            export NODE_ENV=''${NODE_ENV:-development}
          '';
        };
      }
    );
}

