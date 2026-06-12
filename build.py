import os
import shutil
import zipfile

def build():
    print("=== VEL Cryptography Engine - Production Build Pipeline ===")
    print("==========================================================")
    
    # Define paths
    root_dir = os.path.dirname(os.path.abspath(__file__))
    dist_dir = os.path.join(root_dir, "dist")
    zip_path = os.path.join(root_dir, "vel_release.zip")
    
    # 1. Clean previous build files
    if os.path.exists(dist_dir):
        print("Cleaning old dist/ directory...")
        shutil.rmtree(dist_dir)
    if os.path.exists(zip_path):
        print("Cleaning old zip release...")
        os.remove(zip_path)
        
    # Create fresh dist/ directory
    os.makedirs(dist_dir)
    
    # 2. Files and folders to copy
    files_to_copy = [
        "index.html",
        "style.css",
        "LICENSE",
        "README.md"
    ]
    
    folders_to_copy = [
        "js",
        "firmware",
        "idris"
    ]
    
    # Copy files
    print("\nCopying core project assets...")
    for file_name in files_to_copy:
        src = os.path.join(root_dir, file_name)
        if os.path.exists(src):
            shutil.copy(src, dist_dir)
            print(f"  -> Copied {file_name}")
        else:
            print(f"  [Warning]: {file_name} not found.")
            
    # Copy folders
    for folder_name in folders_to_copy:
        src = os.path.join(root_dir, folder_name)
        dst = os.path.join(dist_dir, folder_name)
        if os.path.exists(src):
            shutil.copytree(src, dst)
            print(f"  -> Copied folder {folder_name}/")
        else:
            print(f"  [Warning]: Folder {folder_name}/ not found.")
            
    # 3. Create zip archive of the build
    print("\nPackaging distribution archive...")
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for root, dirs, files in os.walk(dist_dir):
            for file in files:
                file_path = os.path.join(root, file)
                # Store paths relative to dist_dir
                arc_name = os.path.relpath(file_path, dist_dir)
                zip_file.write(file_path, arc_name)
                
    print(f"  -> Created release archive: {os.path.basename(zip_path)}")
    print("\n==========================================================")
    print("SUCCESS: Production assets structured in dist/ and zipped!")
    print("==========================================================")

if __name__ == "__main__":
    build()
