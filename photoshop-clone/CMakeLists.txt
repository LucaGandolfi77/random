cmake_minimum_required(VERSION 3.16)
project(PhotoshopClone VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Opzioni build
option(BUILD_WITH_OPENCV "Build with OpenCV support" ON)
option(BUILD_TESTS "Build tests" OFF)

# Trova Qt6
find_package(Qt6 REQUIRED COMPONENTS Core Gui Widgets OpenGL)

# OpenCV (opzionale)
if(BUILD_WITH_OPENCV)
    find_package(OpenCV REQUIRED)
    message(STATUS "OpenCV version: ${OpenCV_VERSION}")
endif()

# Directory sorgenti
set(SOURCES
    src/main.cpp
    src/MainWindow.cpp
    src/Canvas.cpp
    src/LayerManager.cpp
    src/ImageProcessor.cpp
    src/tools/BrushTool.cpp
    src/tools/SelectionTool.cpp
)

set(HEADERS
    src/MainWindow.h
    src/Canvas.h
    src/LayerManager.h
    src/ImageProcessor.h
    src/tools/BrushTool.h
    src/tools/SelectionTool.h
)

# Crea l'eseguibile
add_executable(${PROJECT_NAME} ${SOURCES} ${HEADERS})

# Collega le librerie
target_link_libraries(${PROJECT_NAME}
    Qt6::Core
    Qt6::Gui
    Qt6::Widgets
    Qt6::OpenGL
)

if(BUILD_WITH_OPENCV)
    target_link_libraries(${PROJECT_NAME} ${OpenCV_LIBS})
    target_compile_definitions(${PROJECT_NAME} PRIVATE WITH_OPENCV)
endif()

# Include directories
target_include_directories(${PROJECT_NAME} PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/src
    ${CMAKE_CURRENT_SOURCE_DIR}/external
)

# Installazione
install(TARGETS ${PROJECT_NAME}
    RUNTIME DESTINATION bin
)

# Installazione risorse
install(DIRECTORY assets/
    DESTINATION bin/assets
)

# Dist
set(CPACK_PACKAGE_NAME "PhotoshopClone")
set(CPACK_PACKAGE_VERSION ${PROJECT_VERSION})
set(CPACK_PACKAGE_DESCRIPTION "A Photoshop-like image editor")
include(CPack)