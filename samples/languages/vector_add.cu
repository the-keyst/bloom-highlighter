#include <cuda_runtime.h>
#include <cstdio>
#include <cstdlib>

__global__ void add_offset(float *values, int length, float offset) {
    int index = blockIdx.x * blockDim.x + threadIdx.x;
    if (index >= length) return;
    values[index] += offset;
}

bool check_cuda(cudaError_t result, const char *operation) {
    if (result == cudaSuccess) return true;
    std::fprintf(stderr, "%s: %s\n", operation, cudaGetErrorString(result));
    return false;
}

int main() {
    constexpr int length = 8;
    constexpr size_t bytes = length * sizeof(float);
    float host[length] = {0, 1, 2, 3, 4, 5, 6, 7};
    float *device = nullptr;

    if (!check_cuda(cudaMalloc(reinterpret_cast<void **>(&device), bytes), "allocate device memory")) return 1;
    if (!check_cuda(cudaMemcpy(device, host, bytes, cudaMemcpyHostToDevice), "copy input")) {
        cudaFree(device);
        return 1;
    }

    add_offset<<<1, 32>>>(device, length, 10.0f);
    bool ready = check_cuda(cudaGetLastError(), "launch kernel");
    ready = ready && check_cuda(cudaDeviceSynchronize(), "wait for kernel");
    ready = ready && check_cuda(cudaMemcpy(host, device, bytes, cudaMemcpyDeviceToHost), "copy output");
    cudaFree(device);
    if (!ready) return 1;
    for (float value : host) std::printf("%.1f\n", value);
    return 0;
}
